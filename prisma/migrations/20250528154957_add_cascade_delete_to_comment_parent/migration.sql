-- DropForeignKey
ALTER TABLE "comment" DROP CONSTRAINT "comment_parent_comment_id_fkey";

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
