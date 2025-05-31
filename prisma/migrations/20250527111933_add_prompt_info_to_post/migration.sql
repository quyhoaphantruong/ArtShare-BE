-- AlterTable
ALTER TABLE "post" ADD COLUMN     "art_generation_id" INTEGER;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_art_generation_id_fkey" FOREIGN KEY ("art_generation_id") REFERENCES "art_generation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
