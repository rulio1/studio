
export const typeDefs = `#graphql
  type Poll {
    options: [String]!
    votes: [Int]!
  }

  type QuotedPost {
    id: ID!
    authorId: String!
    author: String
    handle: String
    content: String
    image: String
    createdAt: String
    isVerified: Boolean
    badgeTier: String
  }
  
  type Post {
    id: ID!
    authorId: String!
    author: User
    avatar: String
    handle: String
    content: String
    createdAt: String
    editedAt: String
    likes: [String]
    comments: Int
    retweets: [String]
    views: Int
    image: String
    gifUrl: String
    isVerified: Boolean
    badgeTier: String
    poll: Poll
    quotedPostId: String
    quotedPost: QuotedPost
    spotifyUrl: String
  }

  type User {
    uid: ID!
    displayName: String
    email: String
    handle: String
    avatar: String
    banner: String
    bio: String
    location: String
    website: String
    birthDate: String
    createdAt: String
    followers: [String]
    following: [String]
    pinnedPostId: String
    isVerified: Boolean
    badgeTier: String
    supporterTier: String
    likesArePrivate: Boolean
  }

  type Query {
    posts(limit: Int): [Post]
    user(id: ID!): User
    userPosts(userId: ID!): [Post]
  }
`;
