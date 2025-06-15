const Blog = require('../models/Blog');
const calculateReadingTime = require('../utils/readingTime');

// Create a blog (draft by default)
exports.createBlog = async (req, res) => {
  try {
    const { title, description, tags, body } = req.body;

    const reading_time = calculateReadingTime(body);

    const newBlog = new Blog({
      title,
      description,
      tags,
      body,
      author: req.user._id,
      state: 'draft', // default
      reading_time: calculateReadingTime(body),
      read_count: 0
    });

    const savedBlog = await newBlog.save();
    res.status(201).json(savedBlog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all published blogs (public)
exports.getAllPublishedBlogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, author, title, tags, orderBy = 'timestamp' } = req.query;

    const query = { state: 'published' };

    if (title) query.title = new RegExp(title, 'i');

    if (tags) query.tags = { $in: tags.split(',') };

    let blogs = await Blog.find(query)
      .populate('author', 'first_name last_name email')
      .sort({ [orderBy]: -1 });

    if (author) {
      blogs = blogs.filter(blog => {
        if (blog.author) {
          const fullName = `${blog.author.first_name} ${blog.author.last_name}`.toLowerCase();
          return fullName.includes(author.toLowerCase());
        }
        return false;
      });
    }

    const start = (page - 1) * limit;
    const end = start + parseInt(limit);
    const paginatedBlogs = blogs.slice(start, end);

    res.json({
      blogs: paginatedBlogs,
      totalCount: blogs.length,
      totalPages: Math.ceil(blogs.length / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Get one published blog and increment read_count
exports.getOnePublishedBlog = async (req, res) => {
  try {
    const blog = await Blog.findOne({ _id: req.params.id, state: 'published' }).populate('author', 'first_name last_name email');

    if (!blog) 
      return res.status(403).json({ message: 'Blog not found' });

    blog.read_count += 1;
    await blog.save();

    res.json(blog);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all blogs by logged in user
exports.getMyBlogs = async (req, res) => {
  try {
    const { state, page = 1, limit = 10 } = req.query;

    const filter = { author: req.user._id };
    if (state) filter.state = state;

    const totalBlogs = await Blog.countDocuments(filter);

    const blogs = await Blog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      status: 'success',
      total: totalBlogs,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalBlogs / limit),
      blogs
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};


// Edit blog (only by owner)
exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !blog.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { title, description, tags, body } = req.body;

    if (title) blog.title = title;
    if (description) blog.description = description;
    if (tags) blog.tags = tags;
    if (body) {
      blog.body = body;
      blog.reading_time = calculateReadingTime(body);
    }

    const updated = await blog.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !blog.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await blog.deleteOne();
    res.json({ message: 'Blog deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Publish blog
exports.publishBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog || !blog.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    blog.state = 'published';
    const updated = await blog.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
