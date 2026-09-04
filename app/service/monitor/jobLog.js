/**
 * 定时任务调度日志服务层
 * @Author: 姜彦汐
 * @Date: 2025-11-08
 */

const Service = require('egg').Service;

class JobLogService extends Service {
  _toObjectId(id) {
    if (!id) return id;
    return typeof id === 'string'
      ? new this.app.mongoose.Types.ObjectId(id)
      : id;
  }

  _buildFilter(params) {
    const filter = {};
    if (params.jobName) {
      filter.jobName = { $regex: params.jobName, $options: 'i' };
    }
    if (params.jobGroup) filter.jobGroup = params.jobGroup;
    if (params.status) filter.status = params.status;
    if (params.invokeTarget) {
      filter.invokeTarget = { $regex: params.invokeTarget, $options: 'i' };
    }
    const beginTime = (params.params && params.params.beginTime) || params.beginTime;
    const endTime = (params.params && params.params.endTime) || params.endTime;
    if (beginTime) {
      filter.createTime = { ...filter.createTime, $gte: new Date(beginTime) };
    }
    if (endTime) {
      filter.createTime = { ...filter.createTime, $lte: new Date(endTime) };
    }
    return filter;
  }

  // ==================== 分页查询 ====================

  async selectJobLogPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysJobLog, filter, params,
      { sort: { createTime: -1 }, idField: 'jobLogId' }
    );
  }

  // ==================== 查询列表 ====================

  async selectJobLogList(page, jobLog = {}) {
    const filter = this._buildFilter({ ...jobLog, params: { beginTime: jobLog.beginTime, endTime: jobLog.endTime } });
    let query = this.ctx.model.SysJobLog.find(filter).sort({ createTime: -1 });

    if (page && page.pageNum != null && page.pageSize != null) {
      const pageNum = parseInt(page.pageNum) || 1;
      const pageSize = parseInt(page.pageSize) || 10;
      query = query.skip((pageNum - 1) * pageSize).limit(pageSize);
    }

    const list = await query.lean();
    return this.ctx.helper.normalizeIds(list, 'jobLogId');
  }

  async selectJobLogCount(jobLog = {}) {
    const filter = this._buildFilter({ ...jobLog, params: { beginTime: jobLog.beginTime, endTime: jobLog.endTime } });
    return await this.ctx.model.SysJobLog.countDocuments(filter);
  }

  // ==================== 按 ID 查询 ====================

  async selectJobLogById(jobLogId) {
    const doc = await this.ctx.model.SysJobLog.findById(this._toObjectId(jobLogId)).lean();
    if (doc && doc._id != null) doc.jobLogId = doc._id;
    return doc;
  }

  // ==================== 新增 ====================

  async insertJobLog(jobLog) {
    const doc = {};
    if (jobLog.jobName) doc.jobName = jobLog.jobName;
    if (jobLog.jobGroup) doc.jobGroup = jobLog.jobGroup;
    if (jobLog.invokeTarget) doc.invokeTarget = jobLog.invokeTarget;
    if (jobLog.jobMessage) doc.jobMessage = jobLog.jobMessage;
    if (jobLog.status) doc.status = jobLog.status;
    if (jobLog.exceptionInfo) doc.exceptionInfo = jobLog.exceptionInfo;
    doc.createTime = jobLog.createTime ? new Date(jobLog.createTime) : new Date();

    await this.ctx.model.SysJobLog.create(doc);
    return 1;
  }

  // ==================== 删除 ====================

  async deleteJobLogByIds(jobLogIds) {
    const ids = jobLogIds.map(id => this._toObjectId(id));
    const result = await this.ctx.model.SysJobLog.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  async deleteJobLogById(jobLogId) {
    const result = await this.ctx.model.SysJobLog.deleteOne({ _id: this._toObjectId(jobLogId) });
    return result.deletedCount;
  }

  async cleanJobLog() {
    const result = await this.ctx.model.SysJobLog.deleteMany({});
    return result.deletedCount;
  }

  async deleteJobLogByDate(beforeDate) {
    const list = await this.selectJobLogList(null, { params: { endTime: beforeDate } });
    if (!list || list.length === 0) return 0;
    const ids = list.map(log => log._id);
    const result = await this.ctx.model.SysJobLog.deleteMany({ _id: { $in: ids } });
    return result.deletedCount;
  }

  // ==================== 记录日志 ====================

  async recordJobLog(jobName, jobGroup, invokeTarget, status, jobMessage, exceptionInfo = '') {
    try {
      await this.insertJobLog({
        jobName, jobGroup, invokeTarget, status, jobMessage,
        exceptionInfo: (exceptionInfo || '').substring(0, 2000),
        createTime: this.ctx.helper.formatDate(new Date()),
      });
    } catch (err) {
      this.ctx.logger.error('记录任务执行日志失败:', err);
    }
  }

  // ==================== 导出 ====================

  async exportJobLog(list) {
    const headers = ['日志编号', '任务名称', '任务组名', '调用目标', '日志信息', '执行状态', '异常信息', '执行时间'];
    let csv = headers.join(',') + '\n';

    list.forEach(item => {
      const row = [
        item._id, item.jobName, item.jobGroup, item.invokeTarget, item.jobMessage,
        item.status === '0' ? '成功' : '失败', item.exceptionInfo || '', item.createTime,
      ];
      const escapedRow = row.map(cell => {
        const cellStr = String(cell || '');
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      csv += escapedRow.join(',') + '\n';
    });

    return Buffer.from('﻿﻿' + csv, 'utf8');
  }

  // ==================== 统计 ====================

  async getJobLogStatistics(params = {}) {
    const filter = this._buildFilter({ ...params, params: { beginTime: params.beginTime, endTime: params.endTime } });
    const list = await this.ctx.model.SysJobLog.find(filter).lean();

    const stats = { total: list.length, successCount: 0, failureCount: 0, successRate: 0 };
    list.forEach(log => { log.status === '0' ? stats.successCount++ : stats.failureCount++; });
    if (stats.total > 0) {
      stats.successRate = (stats.successCount / stats.total * 100).toFixed(2) + '%';
    }
    return stats;
  }
}

module.exports = JobLogService;
