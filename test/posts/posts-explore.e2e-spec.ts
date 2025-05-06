// test/posts-explore.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { PostsExploreService } from 'src/posts/posts-explore.service';

describe(`/user/:username (GET)`, () => {
  let app: INestApplication;
  let service: Partial<Record<keyof PostsExploreService, jest.Mock>>;

  beforeAll(async () => {
    service = {
      findPostsByUsername: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PostsExploreModule],
    })
      // substitute the real service with our mock
      .overrideProvider(PostsExploreService)
      .useValue(service)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  it(`200 → returns the DTO array when user exists`, async () => {
    const fakeDto: PostListItemResponseDto = {
      id: 42,
      title: 'Hello World',
      excerpt: '…',
      created_at: new Date(),
      user: { username: 'alice', id: 'u1', avatarUrl: null },
      medias: [],
      categories: [],
      like_count: 0,
      share_count: 0,
    };

    service.findPostsByUsername.mockResolvedValue([fakeDto]);

    return request(app.getHttpServer())
      .get('/posts-explore/user/alice?page=2&page_size=5')
      .expect(200)
      .expect((res) => {
        expect(service.findPostsByUsername).toHaveBeenCalledWith(
          'alice',
          2,
          5,
        );
        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: 42, title: 'Hello World' }),
          ]),
        );
      });
  });

  it(`404 → when the service throws NotFoundException`, () => {
    service.findPostsByUsername.mockRejectedValue(new NotFoundException());

    return request(app.getHttpServer())
      .get('/posts-explore/user/doesnotexist')
      .expect(404);
  });

  it(`400 → invalid page/page_size params`, () => {
    // page_size must be numeric
    return request(app.getHttpServer())
      .get('/posts-explore/user/alice?page=abc&page_size=xyz')
      .expect(400);
  });
});
