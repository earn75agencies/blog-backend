const Workspace = require('../models/Workspace.model');
const { asyncHandler } = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

/**
 * @desc    Create workspace
 * @route   POST /api/workspaces
 * @access  Private
 */
exports.createWorkspace = asyncHandler(async (req, res) => {
  const { name, description, isPublic } = req.body;

  const workspace = await Workspace.create({
    name,
    description,
    owner: req.user._id,
    members: [
      {
        user: req.user._id,
        role: 'admin',
        permissions: {
          canEdit: true,
          canPublish: true,
          canDelete: true,
          canManage: true,
        },
      },
    ],
    settings: {
      isPublic: isPublic || false,
      allowInvites: true,
    },
  });

  res.status(201).json({
    status: 'success',
    data: { workspace },
  });
});

/**
 * @desc    Invite member to workspace
 * @route   POST /api/workspaces/:id/invite
 * @access  Private
 */
exports.inviteMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId, role, permissions } = req.body;

  const workspace = await Workspace.findById(id);
  if (!workspace) {
    throw new ErrorResponse('Workspace not found', 404);
  }

  // Check if user is admin or owner
  const isAdmin = workspace.owner.toString() === req.user._id.toString() ||
    workspace.members.some(
      m => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );

  if (!isAdmin) {
    throw new ErrorResponse('Not authorized to invite members', 403);
  }

  // Check if already a member
  const existingMember = workspace.members.find(
    m => m.user.toString() === userId.toString()
  );

  if (existingMember) {
    throw new ErrorResponse('User is already a member', 400);
  }

  workspace.members.push({
    user: userId,
    role: role || 'contributor',
    permissions: permissions || {
      canEdit: false,
      canPublish: false,
      canDelete: false,
      canManage: false,
    },
  });

  await workspace.save();

  res.json({
    status: 'success',
    message: 'Member invited successfully',
    data: { workspace },
  });
});

/**
 * @desc    Get workspace
 * @route   GET /api/workspaces/:id
 * @access  Private
 */
exports.getWorkspace = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const workspace = await Workspace.findById(id)
    .populate('owner', 'username avatar')
    .populate('members.user', 'username avatar')
    .populate('projects', 'title slug status')
    .populate('mediaLibrary', 'url thumbnail');

  if (!workspace) {
    throw new ErrorResponse('Workspace not found', 404);
  }

  // Check if user has access
  const hasAccess =
    workspace.owner.toString() === req.user._id.toString() ||
    workspace.members.some(m => m.user.toString() === req.user._id.toString()) ||
    workspace.settings.isPublic ||
    req.user.role === 'admin';

  if (!hasAccess) {
    throw new ErrorResponse('Not authorized to access this workspace', 403);
  }

  res.json({
    status: 'success',
    data: { workspace },
  });
});

