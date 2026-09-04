/*
 * @Description: 操作日志服务层
 * @Author: AI Assistant
 * @Date: 2025-10-24
 */

const Service = require("egg").Service;

class OperlogService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.operIp) {
      filter.operIp = { $regex: params.operIp, $options: 'i' };
    }
    if (params.title) {
      filter.title = { $regex: params.title, $options: 'i' };
    }
    if (params.businessType != null) filter.businessType = parseInt(params.businessType);
    if (params.businessTypes && params.businessTypes.length > 0) {
      filter.businessType = { $in: params.businessTypes.map(t => parseInt(t)) };
    }
    if (params.status != null) filter.status = parseInt(params.status);
    if (params.operName) {
      filter.operName = { $regex: params.operName, $options: 'i' };
    }
    const beginTime = (params.params && params.params.beginTime) || params.beginTime;
    const endTime = (params.params && params.params.endTime) || params.endTime;
    if (beginTime) {
      filter.operTime = { ...filter.operTime, $gte: new Date(beginTime) };
    }
    if (endTime) {
      filter.operTime = { ...filter.operTime, $lte: new Date(endTime) };
    }
    return filter;
  }

  async selectOperLogPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysOperLog, filter, params,
      { sort: { operTime: -1 }, idField: 'operId' }
    );
  }

  /**
   * 查询操作日志列表
   * @param {object} operLog - 查询参数
   * @return {array} 操作日志列表
   */
  async selectOperLogList(operLog = {}) {
    const filter = this._buildFilter({
      ...operLog,
      params: { beginTime: operLog.beginTime, endTime: operLog.endTime },
    });
    const list = await this.ctx.model.SysOperLog.find(filter).sort({ operTime: -1 }).lean();
    return this.ctx.helper.normalizeIds(list, 'operId');
  }

  /**
   * 根据操作日志ID查询操作日志
   * @param {number} operId - 操作日志ID
   * @return {object} 操作日志信息
   */
  async selectOperLogById(operId) {
    const doc = await this.ctx.model.SysOperLog.findById(this._toObjectId(operId)).lean();
    if (doc && doc._id != null) doc.operId = doc._id;
    return doc;
  }

  /**
   * 删除操作日志
   * @param {array} operIds - 操作日志ID数组
   * @return {object} 删除结果
   */
  async deleteOperLogByIds(operIds) {
    const ids = operIds.map(id => this._toObjectId(id));
    const result = await this.ctx.model.SysOperLog.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  /**
   * 清空操作日志
   */
  async cleanOperLog() {
    const result = await this.ctx.model.SysOperLog.deleteMany({});
    return result.deletedCount;
  }

  /**
   * 记录操作日志
   * @param {object} operLog - 操作日志对象
   */
  async recordOperLog(operLog) {
    const { ctx } = this;
    try {
      await ctx.model.SysOperLog.create({
        title: operLog.title || "",
        businessType: operLog.businessType || 0,
        method: operLog.method || "",
        requestMethod: operLog.requestMethod || ctx.method,
        operatorType: operLog.operatorType || 0,
        operName: operLog.operName || (ctx.state.user ? ctx.state.user.userName : ""),
        deptName: operLog.deptName || "",
        operUrl: operLog.operUrl || ctx.url,
        operIp: operLog.operIp || ctx.helper.getClientIP(ctx),
        operLocation: operLog.operLocation || "",
        operParam: operLog.operParam || JSON.stringify(ctx.request.body),
        jsonResult: operLog.jsonResult || "",
        status: operLog.status || 0,
        errorMsg: operLog.errorMsg || "",
        costTime: operLog.costTime || 0,
        operTime: new Date(),
      });
    } catch (err) {
      ctx.logger.error("记录操作日志失败:", err);
    }
  }
}

module.exports = OperlogService;
