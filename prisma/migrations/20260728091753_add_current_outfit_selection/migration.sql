-- CreateTable
CREATE TABLE "current_outfit_selection" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "clothing_item_id" BIGINT NOT NULL,
    "category" "clothing_category" NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "current_outfit_selection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_current_outfit_selection_user_id" ON "current_outfit_selection"("user_id");

-- CreateIndex
CREATE INDEX "idx_current_outfit_selection_clothing_item_id" ON "current_outfit_selection"("clothing_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_current_outfit_selection_user_category" ON "current_outfit_selection"("user_id", "category");

-- AddForeignKey
ALTER TABLE "current_outfit_selection" ADD CONSTRAINT "current_outfit_selection_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "current_outfit_selection" ADD CONSTRAINT "current_outfit_selection_clothing_item_id_fkey" FOREIGN KEY ("clothing_item_id") REFERENCES "clothing_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
