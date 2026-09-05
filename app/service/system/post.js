/*
 * @Description: 岗位服务层
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

  /**
   * 查询所有岗位
   * @return {array} 岗位列表
   */
  async selectPostAll() {
    const list = await this.ctx.model.SysPost.find().lean();
    return this.ctx.helper.normalizeIds(list, 'postId');
  }

  /**
   * 根据用户ID查询岗位列表
   * @param {number} userId - 用户ID
   * @return {array} 岗位ID列表
   */
  async selectPostListByUserId(userId) {
    const _id = this._toObjectId(userId);
    const userPosts = await this.ctx.model.SysUserPost.find({ userId: _id }).select('postId').lean();
    return userPosts.map(up => up.postId);
  }

  /**
   * 查询岗位列表
   * @param {object} post - 查询参数
   * @return {array} 岗位列表
   */
  async selectPostList(post = {}) {
    const filter = this._buildFilter(post);
    const list = await this.ctx.model.SysPost.find(filter).lean();
    return this.ctx.helper.normalizeIds(list, 'postId');
  }

  /**
   * 根据岗位ID查询岗位
   * @param {number} postId - 岗位ID
   * @return {object} 岗位信息
   */
  async selectPostById(postId) {
    const doc = await this.ctx.model.SysPost.findById(this._toObjectId(postId)).lean();
    if (doc && doc._id != null) doc.postId = doc._id;
    return doc;
  }

  /**
   * 校验岗位名称是否唯一
   * @param {object} post - 岗位对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkPostNameUnique(post) {
    const existing = await this.ctx.model.SysPost.findOne({ postName: post.postName }).lean();
    if (!existing) return true;
    const postId = post.postId || post._id;
    return !postId || existing._id.toString() === postId.toString();
  }

  /**
   * 校验岗位编码是否唯一
   * @param {object} post - 岗位对象
   * @return {boolean} true-唯一 false-不唯一
   */
  async checkPostCodeUnique(post) {
    const existing = await this.ctx.model.SysPost.findOne({ postCode: post.postCode }).lean();
    if (!existing) return true;
    const postId = post.postId || post._id;
    return !postId || existing._id.toString() === postId.toString();
  }

  /**
   * 新增岗位
   * @param {object} post - 岗位对象
   * @return {number} 影响行数
   */
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

  /**
   * 修改岗位
   * @param {object} post - 岗位对象
   * @return {number} 影响行数
   */
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

  /**
   * 删除岗位
   * @param {array} postIds - 岗位ID数组
   * @return {number} 影响行数
   */
  async deletePostByIds(postIds) {
    const ids = postIds.map(id => this._toObjectId(id));
    const result = await this.ctx.model.SysPost.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }
}

module.exports = PostService;
