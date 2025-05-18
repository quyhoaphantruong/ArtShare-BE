// execute: npx tsx ./scripts/deleteUser.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const userIdToDelete = "2ZVG7nhiO1OTfaAIwlXTsVXd7LV2"; // The ID you provided

async function deleteUserAndVerify(userId: string) {
  console.log(`Attempting to delete user: ${userId} and their associated data...`);

  try {
    // Check if user exists before attempting deletion
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      console.log(`User with ID ${userId} not found. Nothing to delete.`);
      return;
    }

    // Start a transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      console.log("Starting transaction...");

      // 1. Manually delete records from models NOT using onDelete: Cascade directly for User
      //    (Only needed if you haven't updated the schema as recommended)
      console.log(`Deleting collections for user ${userId}...`);
      const deletedCollections = await tx.collection.deleteMany({
        where: { user_id: userId },
      });
      console.log(`Deleted ${deletedCollections.count} collection(s).`);

      console.log(`Deleting art generations for user ${userId}...`);
      const deletedArtGenerations = await tx.artGeneration.deleteMany({
        where: { user_id: userId },
      });
      console.log(`Deleted ${deletedArtGenerations.count} art generation(s).`);

      // If Media.creator_id could be orphaned and needs explicit cleanup:
      // This is less likely if creator_id always matches post.user_id
      // console.log(`Potentially cleaning up Media records by creator_id ${userId} (if any exist independently)...`);
      // const deletedMediaByCreator = await tx.media.deleteMany({
      //   where: { creator_id: userId }
      // });
      // console.log(`Deleted ${deletedMediaByCreator.count} media record(s) by creator_id.`);


      // 2. Delete the user. Cascades should handle the rest for models with onDelete: Cascade.
      console.log(`Deleting user ${userId}...`);
      await tx.user.delete({
        where: { id: userId },
      });
      console.log(`User ${userId} deleted successfully.`);
      console.log("Transaction committed.");
    });

    console.log("\n--- Verification ---");
    await verifyUserDeletion(userId);

  } catch (error) {
    console.error("Error during user deletion process:", error);
    if (error.code === 'P2025') { // Prisma's "Record to delete does not exist."
        console.warn(`User with ID ${userId} might have already been deleted or never existed.`);
    } else if (error.message.includes("Foreign key constraint failed")) {
        console.error("A foreign key constraint failed. This likely means some related data was not properly handled by cascades or manual deletion. Review your schema's onDelete actions.");
    }
    // Optionally, try to verify even if deletion failed to see what remains
    console.log("\n--- Attempting Verification After Error ---");
    await verifyUserDeletion(userId);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyUserDeletion(userId: string) {
  let allClear = true;
  const checks = [];

  const user = await prisma.user.findUnique({ where: { id: userId } });
  checks.push({ model: 'User', exists: !!user, count: user ? 1 : 0 });
  if (user) allClear = false;

  const relatedCounts = await prisma.$transaction([
    prisma.userRole.count({ where: { user_id: userId } }),
    prisma.post.count({ where: { user_id: userId } }),
    prisma.blog.count({ where: { user_id: userId } }),
    // For Media, check based on posts by the user (as Media cascades from Post)
    // This is an indirect check. A direct check on creator_id might be needed if schema allows orphaned media.
    prisma.media.count({ where: { post: { user_id: userId } } }), // If post is gone, media should be gone
    // Or if creator_id is a concern directly:
    // prisma.media.count({ where: { creator_id: userId } }),
    prisma.like.count({ where: { user_id: userId } }),
    prisma.commentLike.count({ where: { user_id: userId } }),
    prisma.comment.count({ where: { user_id: userId } }),
    // For replies to the deleted user's comments (their parent_comment_id might be null now)
    // This check ensures no comments *by* the user remain.
    prisma.share.count({ where: { user_id: userId } }),
    prisma.follow.count({ where: { OR: [{ follower_id: userId }, { following_id: userId }] } }),
    prisma.bookmark.count({ where: { user_id: userId } }),
    prisma.rating.count({ where: { user_id: userId } }),
    prisma.collection.count({ where: { user_id: userId } }), // Important if not cascaded
    prisma.report.count({ where: { reporter_id: userId } }),
    // Check if the user was reported (target_type: USER, target_id: userId). These might remain by design.
    // prisma.report.count({ where: { target_id: userId, target_type: 'USER' } }), // Optional check
    prisma.userAccess.count({ where: { userId: userId } }),
    prisma.userUsage.count({ where: { userId: userId } }),
    prisma.artGeneration.count({ where: { user_id: userId } }), // Important if not cascaded
  ]);

  const modelNames = [
    'UserRole', 'Post', 'Blog', 'Media (via Post)', 'Like (by user)', 'CommentLike (by user)',
    'Comment (by user)', 'Share (by user)', 'Follow (as follower/following)',
    'Bookmark (by user)', 'Rating (by user)', 'Collection (by user)',
    'Report (as reporter)', 'UserAccess', 'UserUsage', 'ArtGeneration (by user)'
  ];

  modelNames.forEach((name, index) => {
    checks.push({ model: name, exists: relatedCounts[index] > 0, count: relatedCounts[index] });
    if (relatedCounts[index] > 0) allClear = false;
  });

  console.log("\nVerification Results:");
  checks.forEach(check => {
    console.log(`- ${check.model}: ${check.count} record(s) found. ${check.exists ? 'Problem!' : 'OK.'}`);
  });

  if (allClear) {
    console.log("\nSUCCESS: All data associated with user seems to be deleted.");
  } else {
    console.warn("\nWARNING: Some data associated with the user might still exist. Review the logs.");
  }
  return allClear;
}

// Run the function
deleteUserAndVerify(userIdToDelete)
  .then(() => console.log("Process finished."))
  .catch(e => console.error("Unhandled error in main execution:", e));