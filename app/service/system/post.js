/*
 * @Description: 岗位服务层（MongoDB/Mongoose 版本）
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require('egg').Service;

class PostService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.postCode) {
      filter.postCode = { $regex: params.postCode, $options: 'i' };
    }
    if (params.status) filter.status = params.status;
    if (params.postName) {
      filter.postName = { $regex: params.postName, $options: 'i' };
    }
    return filter;
  }

  async selectPostPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysPost, filter, params, { idField: 'postId' }
    );
  }

  async selectPostAll() {
    const list = await this.ctx.model.SysPost.find().lean();
    return this.ctx.helper.normalizeIds(list, 'postId');
  }

  async selectPostListByUserId(userId) {
    const _id = this._toObjectId(userId);
    const userPosts = await this.ctx.model.SysUserPost.find({ userId: _id }).select('postId').lean();
    return userPosts.map(up => up.postId);
  }

  async selectPostList(post = {}) {
    const filter = this._buildFilter(post);
    const list = await this.ctx.model.SysPost.find(filter).lean();
    return this.ctx.helper.normalizeIds(list, 'postId');
  }

  async selectPostById(postId) {
    const doc = await this.ctx.model.SysPost.findById(this._toObjectId(postId)).lean();
    if (doc && doc._id != null) doc.postId = doc._id;
    return doc;
  }

  async checkPostNameUnique(post) {
    const existing = await this.ctx.model.SysPost.findOne({ postName: post.postName }).lean();
    if (!existing) return true;
    const postId = post.postId || post._id;
    return !postId || existing._id.toString() === postId.toString();
  }

  async checkPostCodeUnique(post) {
    const existing = await this.ctx.model.SysPost.findOne({ postCode: post.postCode }).lean();
    if (!existing) return true;
    const postId = post.postId || post._id;
    return !postId || existing._id.toString() === postId.toString();
  }

  async insertPost(post) {
    const { ctx } = this;
    post.createBy = ctx.state.user.userName;

    const doc = { createTime: new Date() };
    if (post.postCode) doc.postCode = post.postCode;
    if (post.postName) doc.postName = post.postName;
    if (post.postSort != null) doc.postSort = post.postSort;
    if (post.status) doc.status = post.status;
    if (post.remark) doc.remark = post.remark;
    if (post.createBy) doc.createBy = post.createBy;

    const result = await this.ctx.model.SysPost.create(doc);
    return result._id;
  }

  async updatePost(post) {
    const { ctx } = this;
    post.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };
    if (post.postCode) setFields.postCode = post.postCode;
    if (post.postName) setFields.postName = post.postName;
    if (post.postSort != null) setFields.postSort = post.postSort;
    if (post.status) setFields.status = post.status;
    if (post.remark !== undefined) setFields.remark = post.remark;
    if (post.updateBy) setFields.updateBy = post.updateBy;

    const result = await this.ctx.model.SysPost.updateOne(
      { _id: this._toObjectId(post.postId) },
      { $set: setFields }
    );
    return result.modifiedCount;
  }

  async deletePostByIds(postIds) {
    const ids = postIds.map(id => this._toObjectId(id));
    const result = await this.ctx.model.SysPost.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }
}

module.exports = PostService;
