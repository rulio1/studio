
export const typeDefs = `#graphql
  type Post {
    id: ID!
    authorId: String!
    avatar: String
    author: String
    handle: String
    content: String
    createdAt: String
    likes: [String]
    comments: Int
    retweets: [String]
    views: Int
    image: String
    isVerified: Boolean
    badgeTier: String
  }

  type Query {
    posts(limit: Int): [Post]
  }
`;
