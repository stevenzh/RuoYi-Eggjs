/**
 * 会员
 * 对应 users 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const bcrypt = require('bcryptjs');

  const UserSchema = new mongoose.Schema({
    // 用户名称
    username: { type: String, required: [true, '请输入用户名'], unique: true, trim: true, maxlength: 63, index: true },
    email: { type: String, match: [/^\S+@\S+\.\S+$/, '请输入有效邮箱'] },    // 邮箱
    password: { type: String, default: '', maxlength: 63, select: false },     // 密码  // 查询默认不返回密码
    gender: { type: Number, default: 0, enum: [0, 1, 2] },    // 性别：0 未知，1 男，2 女
    birthday: { type: Date, default: null },    // 生日
    lastLoginTime: { type: Date, default: null },    // 最近一次登录时间
    lastLoginIp: { type: String, default: '', maxlength: 63 },    // 最近一次登录IP
    userLevel: { type: Number, default: 0, enum: [0, 1, 2] },    // 用户层级：0 普通用户，1 VIP，2 代理
    nickname: { type: String, default: '', maxlength: 63, trim: true },    // 用户昵称
    mobile: { type: String, default: '', maxlength: 20, trim: true },    // 手机号
    avatar: { type: String, default: '', maxlength: 255 },    // 头像
    weixinOpenid: { type: String, default: '', maxlength: 63, index: true },    // 微信 openid
    status: { type: Number, default: 0, enum: [0, 1, 2] },    // 状态：0 可用，1 禁用，2 注销
    deleted: { type: Boolean, default: false },    // 逻辑删除 0=未删除 1=已删除
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SysUser', default: null },    // 关联后端用户
    address: [String],    // 地址
    introduction: { type: String, default: '', maxlength: 255 },    // 个人介绍
    photos: { type: [String], default: [] },
  }, {
    timestamps: { createdAt: 'addTime', updatedAt: 'updateTime' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  });

  // 密码加密
  UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  });

  // 密码验证
  UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  // 全局查询过滤已删除用户
  UserSchema.pre(/^find/, function (next) {
    this.find({ deleted: false });
    next();
  });

  return mongoose.model('User', UserSchema);
};
