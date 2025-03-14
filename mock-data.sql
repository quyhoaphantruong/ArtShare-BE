-- DELETE existing data to prevent duplicate inserts
TRUNCATE TABLE public.like RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.comment RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.share RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.media RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.post RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.category RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.user RESTART IDENTITY CASCADE;

-- Insert Users
INSERT INTO public.user (username, email, password_hash, full_name, profile_picture_url, bio, created_at)
VALUES
('alice', 'alice@example.com', 'hashed_password_1', 'Alice Johnson', 'https://example.com/alice.jpg', 'Software Engineer', NOW()),
('bob', 'bob@example.com', 'hashed_password_2', 'Bob Smith', 'https://example.com/bob.jpg', 'Tech Enthusiast', NOW());

-- Insert Posts
INSERT INTO public.post (user_id, title, description, created_at, is_published, is_private, group_id, share_count, comment_count)
VALUES
(1, 'First Post', 'This is my first post!', NOW(), true, false, NULL, 10, 5),
(2, 'Exploring Prisma', 'How to use Prisma with NestJS', NOW(), true, false, NULL, 8, 3);

-- Insert Categories
INSERT INTO public.category (cate_name, created_at)
VALUES
('Tech', NOW()),
('Programming', NOW()),
('Lifestyle', NOW());

-- Insert Media
INSERT INTO public.media (post_id, media_type, description, url, creator, downloads, created_at)
VALUES
(1, 'IMAGE', 'A cool image', 'https://example.com/media1.jpg', 'Alice', 100, NOW()),
(2, 'VIDEO', 'A tutorial video', 'https://example.com/video.mp4', 'Bob', 200, NOW());

-- Insert Likes
INSERT INTO public."like" (user_id, target_id, target_type, created_at)
VALUES
(1, 1, 'POST', NOW()),
(2, 1, 'POST', NOW()),
(1, 2, 'POST', NOW());

-- Insert Comments
INSERT INTO public.comment (user_id, parent_comment_id, target_id, target_type, content, created_at)
VALUES
(1, NULL, 1, 'POST', 'Great post!', NOW()),
(2, NULL, 1, 'POST', 'Very helpful, thanks!', NOW()),
(1, 1, 1, 'POST', 'Glad you liked it!', NOW()); -- Reply to comment 1

-- Insert Shares
INSERT INTO public.share (user_id, target_id, target_type, share_platform, created_at)
VALUES
(1, 1, 'POST', 'FACEBOOK', NOW()),
(2, 2, 'POST', 'TWITTER', NOW());
