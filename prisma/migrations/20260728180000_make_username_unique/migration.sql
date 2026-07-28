-- The Better Auth `name` field is used as the application's username.
CREATE UNIQUE INDEX "users_name_key" ON "users"("name");
