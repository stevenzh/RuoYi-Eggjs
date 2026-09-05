/*
 * @Description: 通知公告服务层
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require('egg').Service;

class NoticeService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    const { Types } = this.app.mongoose;
    let _id = id;
    if (typeof id === 'string') {
      // 1. 先校验字符串格式是否合法（轻量级检查，不查数据库）
      if (!Types.ObjectId.isValid(id)) {
        throw new Error('Invalid notice ID format');
      }
      // 2. 校验通过后再安全转换
      _id = new Types.ObjectId(id);
    }
    return _id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.noticeTitle) {
      filter.noticeTitle = { $regex: params.noticeTitle, $options: 'i' };
    }
    if (params.noticeType) filter.noticeType = params.noticeType;
    if (params.createBy) {
      filter.createBy = { $regex: params.createBy, $options: 'i' };
    }
    return filter;
  }

  async selectNoticePage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysNotice, filter, params, { idField: 'noticeId' }
    );
  }

  /**
   * 查询通知公告列表
   * @param {object} notice - 查询参数
   * @return {array} 通知公告列表
   */
  async selectNoticeList(notice = {}) {
    const filter = this._buildFilter(notice);
    const list = await this.ctx.model.SysNotice.find(filter).lean();
    return this.ctx.helper.normalizeIds(list, 'noticeId');
  }

  /**
   * 根据通知公告ID查询通知公告
   * @param {number} noticeId - 通知公告ID
   * @return {object} 通知公告信息
   */
  async selectNoticeById(noticeId) {
    const doc = await this.ctx.model.SysNotice.findById(this._toObjectId(noticeId)).lean();
    if (doc && doc._id != null) doc.noticeId = doc._id;
    return doc;
  }

  /**
   * 新增通知公告
   * @param {object} notice - 通知公告对象
   * @return {number} 影响行数
   */
  async insertNotice(notice) {
    const { ctx } = this;

    // 设置创建信息
    notice.createBy = ctx.state.user.userName;

    const doc = { createTime: new Date() };
    if (notice.noticeTitle) doc.noticeTitle = notice.noticeTitle;
    if (notice.noticeType) doc.noticeType = notice.noticeType;
    if (notice.noticeContent) doc.noticeContent = notice.noticeContent;
    if (notice.status) doc.status = notice.status;
    if (notice.remark) doc.remark = notice.remark;
    if (notice.createBy) doc.createBy = notice.createBy;

    const result = await this.ctx.model.SysNotice.create(doc);
    return result._id;
  }

  /**
   * 修改通知公告
   * @param {object} notice - 通知公告对象
   * @return {number} 影响行数
   */
  async updateNotice(notice) {
    const { ctx } = this;

    // 设置更新信息
    notice.updateBy = ctx.state.user.userName;

    const setFields = { updateTime: new Date() };
    if (notice.noticeTitle) setFields.noticeTitle = notice.noticeTitle;
    if (notice.noticeType) setFields.noticeType = notice.noticeType;
    if (notice.noticeContent !== undefined) setFields.noticeContent = notice.noticeContent;
    if (notice.status) setFields.status = notice.status;
    if (notice.updateBy) setFields.updateBy = notice.updateBy;

    const result = await this.ctx.model.SysNotice.updateOne(
      { _id: this._toObjectId(notice.noticeId) },
      { $set: setFields }
    );
    return result.modifiedCount;
  }

  /**
   * 删除通知公告
   * @param {array} noticeIds - 通知公告ID数组
   * @return {number} 影响行数
   */
  async deleteNoticeByIds(noticeIds) {
    const ids = noticeIds.map(id => this._toObjectId(id));
    const result = await this.ctx.model.SysNotice.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }
}

module.exports = NoticeService;
