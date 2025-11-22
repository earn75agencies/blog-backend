const Group = require('../models/Group.model');
const Post = require('../models/Post.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Get all groups
 * @route   GET /api/groups
 * @access  Public
 */
exports.getGroups = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  
  if (req.query.category) {
    query.category = req.query.category;
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  if (req.query.isPublic !== undefined) {
    query.isPublic = req.query.isPublic === 'true';
  }

  const groups = await Group.find(query)
    .populate('owner', 'username avatar firstName lastName')
    .populate('admins', 'username avatar firstName lastName')
    .skip(skip)
    .limit(limit)
    .sort({ membersCount: -1, createdAt: -1 });

  const total = await Group.countDocuments(query);

  res.json({
    status: 'success',
    results: groups.length,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    data: {
      groups,
    },
  });
});

/**
 * @desc    Get single group
 * @route   GET /api/groups/:slug
 * @access  Public
 */
exports.getGroup = asyncHandler(async (req, res) => {
  const group = await Group.findOne({ slug: req.params.slug })
    .populate('owner', 'username avatar firstName lastName bio')
    .populate('admins', 'username avatar firstName lastName')
    .populate('members.user', 'username avatar firstName lastName')
    .populate('posts', 'title slug excerpt featuredImage publishedAt views likesCount');

  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  if (!group.isPublic && (!req.user || !group.members.some(m => m.user._id.toString() === req.user._id.toString()))) {
    throw new ErrorResponse('Group not found', 404);
  }

  // Check if user is member
  let isMember = false;
  let isAdmin = false;
  if (req.user) {
    const member = group.members.find(m => m.user._id.toString() === req.user._id.toString());
    isMember = !!member;
    isAdmin = group.admins.some(a => a._id.toString() === req.user._id.toString()) || 
              group.owner._id.toString() === req.user._id.toString();
  }

  res.json({
    status: 'success',
    data: {
      group: {
        ...group.toObject(),
        isMember,
        isAdmin,
      },
    },
  });
});

/**
 * @desc    Create group
 * @route   POST /api/groups
 * @access  Private
 */
exports.createGroup = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    tags,
    isPublic,
    requiresApproval,
    rules,
    settings,
    avatar,
    coverImage,
  } = req.body;

  const group = await Group.create({
    name,
    description,
    owner: req.user._id,
    category: category || 'general',
    tags: tags || [],
    isPublic: isPublic !== false,
    requiresApproval: requiresApproval || false,
    rules: rules || [],
    settings: settings || {
      allowMemberPosts: true,
      allowMemberComments: true,
      requireModeration: false,
    },
    avatar,
    coverImage,
  });

  // Add owner as admin
  await group.addAdmin(req.user._id);
  await group.addMember(req.user._id, 'admin');

  const populatedGroup = await Group.findById(group._id)
    .populate('owner', 'username avatar firstName lastName')
    .populate('admins', 'username avatar firstName lastName');

  res.status(201).json({
    status: 'success',
    message: 'Group created successfully',
    data: {
      group: populatedGroup,
    },
  });
});

/**
 * @desc    Update group
 * @route   PUT /api/groups/:id
 * @access  Private/Group Admin
 */
exports.updateGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  const isOwner = group.owner.toString() === req.user._id.toString();
  const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
  
  if (!isOwner && !isAdmin && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to update this group', 403);
  }

  const updateFields = [
    'name', 'description', 'category', 'tags', 'isPublic', 'requiresApproval',
    'rules', 'settings', 'avatar', 'coverImage',
  ];

  updateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (field === 'tags' || field === 'rules') {
        group[field] = Array.isArray(req.body[field])
          ? req.body[field]
          : req.body[field].split(',');
      } else {
        group[field] = req.body[field];
      }
    }
  });

  await group.save();

  const updatedGroup = await Group.findById(group._id)
    .populate('owner', 'username avatar firstName lastName')
    .populate('admins', 'username avatar firstName lastName');

  res.json({
    status: 'success',
    message: 'Group updated successfully',
    data: {
      group: updatedGroup,
    },
  });
});

/**
 * @desc    Delete group
 * @route   DELETE /api/groups/:id
 * @access  Private/Group Owner
 */
exports.deleteGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  if (group.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to delete this group', 403);
  }

  group.isActive = false;
  await group.save();

  res.json({
    status: 'success',
    message: 'Group deleted successfully',
  });
});

/**
 * @desc    Join group
 * @route   POST /api/groups/:id/join
 * @access  Private
 */
exports.joinGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  const result = await group.requestJoin(req.user._id);

  res.json({
    status: 'success',
    message: result.requiresApproval 
      ? 'Join request submitted. Waiting for approval.'
      : 'Successfully joined group',
    data: {
      group,
      requiresApproval: result.requiresApproval,
    },
  });
});

/**
 * @desc    Leave group
 * @route   POST /api/groups/:id/leave
 * @access  Private
 */
exports.leaveGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  if (group.owner.toString() === req.user._id.toString()) {
    throw new ErrorResponse('Group owner cannot leave the group', 400);
  }

  await group.removeMember(req.user._id);

  res.json({
    status: 'success',
    message: 'Left group successfully',
    data: {
      group,
    },
  });
});

/**
 * @desc    Approve join request
 * @route   POST /api/groups/:id/approve/:userId
 * @access  Private/Group Admin
 */
exports.approveJoinRequest = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);
  if (!group) {
    throw new ErrorResponse('Group not found', 404);
  }

  const isOwner = group.owner.toString() === req.user._id.toString();
  const isAdmin = group.admins.some(a => a.toString() === req.user._id.toString());
  
  if (!isOwner && !isAdmin && req.user.role !== 'admin') {
    throw new ErrorResponse('Not authorized to approve join requests', 403);
  }

  if (!group.pendingMembers.includes(req.params.userId)) {
    throw new ErrorResponse('User has not requested to join this group', 400);
  }

  group.pendingMembers = group.pendingMembers.filter(
    id => id.toString() !== req.params.userId.toString()
  );
  await group.addMember(req.params.userId);
  await group.save();

  res.json({
    status: 'success',
    message: 'Join request approved successfully',
    data: {
      group,
    },
  });
});

