# Gidix - Backend API

A comprehensive RESTful API for the Gidix platform built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization (JWT)
- CRUD operations for posts, comments, categories, and tags
- Image upload support (Cloudinary)
- Email verification and password reset
- Advanced search functionality
- Pagination and filtering
- Rate limiting and security middleware
- Comprehensive error handling
- Input validation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer + Cloudinary
- **Email**: Nodemailer
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate Limiting

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/gidi-blog
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
FRONTEND_URL=http://localhost:3000
```

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-password` - Update password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email
- `POST /api/auth/resend-verification` - Resend verification email

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `GET /api/users/profile/:username` - Get user profile
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/follow` - Follow user
- `POST /api/users/:id/unfollow` - Unfollow user
- `GET /api/users/:id/followers` - Get user followers
- `GET /api/users/:id/following` - Get user following
- `GET /api/users/:id/posts` - Get user posts

### Posts
- `GET /api/posts` - Get all posts
- `GET /api/posts/:slug` - Get single post
- `POST /api/posts` - Create post (Author/Admin)
- `PUT /api/posts/:id` - Update post (Author/Admin)
- `DELETE /api/posts/:id` - Delete post (Author/Admin)
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/unlike` - Unlike post
- `GET /api/posts/featured` - Get featured posts
- `GET /api/posts/category/:categoryId` - Get posts by category
- `GET /api/posts/tag/:tagId` - Get posts by tag
- `GET /api/posts/author/:authorId` - Get posts by author
- `GET /api/posts/search` - Search posts
- `GET /api/posts/:id/related` - Get related posts

### Comments
- `GET /api/comments/post/:postId` - Get post comments
- `GET /api/comments/:id` - Get single comment
- `POST /api/comments` - Create comment
- `PUT /api/comments/:id` - Update comment
- `DELETE /api/comments/:id` - Delete comment
- `POST /api/comments/:id/like` - Like comment
- `POST /api/comments/:id/unlike` - Unlike comment
- `GET /api/comments/:id/replies` - Get comment replies

### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:slug` - Get single category
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)
- `GET /api/categories/:id/posts` - Get category posts

### Tags
- `GET /api/tags` - Get all tags
- `GET /api/tags/popular` - Get popular tags
- `GET /api/tags/:slug` - Get single tag
- `POST /api/tags` - Create tag (Admin)
- `PUT /api/tags/:id` - Update tag (Admin)
- `DELETE /api/tags/:id` - Delete tag (Admin)
- `GET /api/tags/:id/posts` - Get tag posts

## Project Structure

```
backend/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── utils/           # Utility functions
├── validators/      # Input validation
├── server.js        # Application entry point
└── package.json     # Dependencies
```

## License

MIT

