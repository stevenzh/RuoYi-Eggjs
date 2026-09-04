/**
 * 菜单模型
 * 对应 MySQL sys_menu 表
 */
module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SysMenuSchema = new Schema({
    menuName: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'SysMenu', default: null },
    orderNum: { type: Number, default: 0 },
    path: { type: String },
    component: { type: String },
    query: { type: String },
    routeName: { type: String },
    isFrame: { type: Number, default: 1 },
    isCache: { type: Number, default: 0 },
    menuType: { type: String, default: '' },
    visible: { type: String, default: '0' },
    status: { type: String, default: '0' },
    perms: { type: String },
    icon: { type: String, default: '#' },
    createBy: { type: String },
    createTime: { type: Date, default: Date.now },
    updateBy: { type: String },
    updateTime: { type: Date, default: Date.now },
    remark: { type: String },
  }, {
    collection: 'sys_menu',
    timestamps: { createdAt: 'createTime', updatedAt: 'updateTime' },
  });

  SysMenuSchema.index({ parentId: 1 });
  SysMenuSchema.index({ orderNum: 1 });

  return mongoose.model('SysMenu', SysMenuSchema);
};
