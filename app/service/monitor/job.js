/**
 * 定时任务服务层
 * @Author: 姜彦汐
 * @Date: 2025-11-08
 */

const Service = require("egg").Service;
const CronUtils = require("../../util/cronUtils");
const scheduleUtils = require("../../util/scheduleUtils");

class JobService extends Service {
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
    return filter;
  }

  _addNextValidTime(jobs) {
    const list = Array.isArray(jobs) ? jobs : [jobs];
    list.forEach(item => {
      if (item.cronExpression) {
        item.nextValidTime = CronUtils.getNextExecution(item.cronExpression);
      }
    });
  }

  // ==================== 查询 ====================

  async selectJobPage(params = {}) {
    const filter = this._buildFilter(params);
    return await this.ctx.helper.pageQueryMongo(
      this.ctx.model.SysJob, filter, params, { idField: 'jobId' }
    );
  }

  async selectJobList(params = {}) {
    const filter = this._buildFilter(params);
    const list = await this.ctx.model.SysJob.find(filter).lean();
    this._addNextValidTime(list);
    return this.ctx.helper.normalizeIds(list, 'jobId') || [];
  }

  async selectJobCount(job = {}) {
    const filter = this._buildFilter(job);
    return await this.ctx.model.SysJob.countDocuments(filter);
  }

  async selectJobById(jobId) {
    const doc = await this.ctx.model.SysJob.findById(this._toObjectId(jobId)).lean();
    if (doc && doc._id != null) doc.jobId = doc._id;
    if (doc) this._addNextValidTime(doc);
    return doc;
  }

  async selectJobAll() {
    const list = await this.ctx.model.SysJob.find().lean();
    return this.ctx.helper.normalizeIds(list, 'jobId');
  }

  // ==================== 新增 ====================

  async insertJob(job) {
    const { ctx } = this;

    if (!job.jobName || job.jobName.trim() === "") {
      throw new Error("任务名称不能为空");
    }
    if (!job.invokeTarget || job.invokeTarget.trim() === "") {
      throw new Error("调用目标字符串不能为空");
    }
    if (!job.cronExpression || job.cronExpression.trim() === "") {
      throw new Error("cron执行表达式不能为空");
    }

    job.jobGroup = job.jobGroup || "DEFAULT";
    job.misfirePolicy = job.misfirePolicy || "3";
    job.concurrent = job.concurrent || "1";
    job.status = job.status || "1";
    job.createBy = ctx.state.user ? ctx.state.user.userName : "system";

    const result = await ctx.model.SysJob.create({
      jobName: job.jobName,
      jobGroup: job.jobGroup,
      invokeTarget: job.invokeTarget,
      cronExpression: job.cronExpression,
      misfirePolicy: job.misfirePolicy,
      concurrent: job.concurrent,
      status: job.status,
      remark: job.remark,
      createBy: job.createBy,
      createTime: new Date(),
    });

    job._id = result._id;
    if (job.status === "0") {
      await this.createBullJob(job);
    }

    return result._id;
  }

  // ==================== 修改 ====================

  async updateJob(job) {
    const { ctx } = this;
    const oldJob = await this.selectJobById(job.jobId);
    if (!oldJob) throw new Error("任务不存在");

    job.updateBy = ctx.state.user ? ctx.state.user.userName : "system";

    const setFields = { updateTime: new Date() };
    if (job.jobName) setFields.jobName = job.jobName;
    if (job.jobGroup) setFields.jobGroup = job.jobGroup;
    if (job.invokeTarget) setFields.invokeTarget = job.invokeTarget;
    if (job.cronExpression) setFields.cronExpression = job.cronExpression;
    if (job.misfirePolicy != null) setFields.misfirePolicy = job.misfirePolicy;
    if (job.concurrent != null) setFields.concurrent = job.concurrent;
    if (job.status != null) setFields.status = job.status;
    if (job.remark) setFields.remark = job.remark;
    if (job.updateBy) setFields.updateBy = job.updateBy;

    const result = await ctx.model.SysJob.updateOne(
      { _id: this._toObjectId(job.jobId) },
      { $set: setFields }
    );

    if (result.modifiedCount > 0) {
      await this.updateBullJob(job, oldJob);
    }

    return result.modifiedCount;
  }

  // ==================== 删除 ====================

  async deleteJobByIds(jobIds) {
    const { ctx } = this;
    const jobs = [];
    for (const jobId of jobIds) {
      const job = await this.selectJobById(jobId);
      if (job) jobs.push(job);
    }

    const ids = jobIds.map(id => this._toObjectId(id));
    const result = await ctx.model.SysJob.deleteMany({ _id: { $in: ids } });

    for (const job of jobs) {
      await this.deleteBullJob(job);
    }

    return result.deletedCount;
  }

  // ==================== 状态变更 ====================

  async changeStatus(job) {
    const { ctx } = this;
    const fullJob = await this.selectJobById(job.jobId);
    if (!fullJob) throw new Error("任务不存在");

    fullJob.status = job.status;
    fullJob.updateBy = ctx.state.user ? ctx.state.user.userName : "system";

    const result = await ctx.model.SysJob.updateOne(
      { _id: this._toObjectId(job.jobId) },
      { $set: { status: job.status, updateBy: fullJob.updateBy, updateTime: new Date() } }
    );

    if (result.modifiedCount > 0) {
      if (job.status === "0") {
        await this.resumeBullJob(fullJob);
      } else {
        await this.pauseBullJob(fullJob);
      }
    }

    return result.modifiedCount;
  }

  async run(job) {
    const fullJob = await this.selectJobById(job.jobId);
    if (!fullJob) return false;
    return await this.runBullJob(fullJob);
  }

  // ==================== 调度管理（Bull） ====================

  async pauseJob(job) {
    return scheduleUtils.pauseJob(job._id ? job._id.toString() : job.jobId, job.jobGroup);
  }

  async resumeJob(job) {
    return scheduleUtils.resumeJob(job, this.executeJob.bind(this));
  }

  async createScheduleJob(job) {
    return scheduleUtils.createJob(job, this.executeJob.bind(this));
  }

  async updateScheduleJob(newJob, oldJob) {
    const newId = newJob._id ? newJob._id.toString() : newJob.jobId;
    const oldId = oldJob._id ? oldJob._id.toString() : oldJob.jobId;
    scheduleUtils.deleteJob(oldId, oldJob.jobGroup);
    if (newJob.status === "0") {
      return scheduleUtils.createJob(newJob, this.executeJob.bind(this));
    }
    return true;
  }

  async executeJob(job) {
    const { ctx } = this;
    const startTime = new Date();
    let status = "0";
    let jobMessage = "";
    let exceptionInfo = "";

    try {
      ctx.logger.info(`开始执行任务: ${job.jobName} (${job.invokeTarget})`);
      const result = await this.invokeMethod(job.invokeTarget);
      jobMessage = result.message || "任务执行成功";
      ctx.logger.info(`任务执行成功: ${job.jobName}`);
    } catch (err) {
      status = "1";
      jobMessage = "任务执行失败";
      exceptionInfo = err.message || err.toString();
      ctx.logger.error(`任务执行失败: ${job.jobName}`, err);
    } finally {
      const duration = Date.now() - startTime;
      await ctx.service.monitor.jobLog.insertJobLog({
        jobName: job.jobName,
        jobGroup: job.jobGroup,
        invokeTarget: job.invokeTarget,
        jobMessage: `${jobMessage} (耗时: ${duration}ms)`,
        status,
        exceptionInfo: exceptionInfo.substring(0, 2000),
        createTime: ctx.helper.formatDate(startTime),
      });
    }
  }

  async invokeMethod(invokeTarget) {
    const { ctx } = this;
    const match = invokeTarget.match(/^(\w+)\.(\w+)(\((.*)\))?$/);
    if (!match) {
      throw new Error(`无效的调用目标格式: ${invokeTarget}`);
    }
    const className = match[1];
    if (className === "ryTask") {
      const RyTask = require("../ryTask");
      const taskInstance = new RyTask(ctx);
      return await taskInstance.execute(invokeTarget);
    }
    throw new Error(`不支持的任务类: ${className}`);
  }

  isValidCron(cronExpression) {
    return CronUtils.isValid(cronExpression);
  }

  async initJobs() {
    const { ctx } = this;
    try {
      ctx.logger.info("开始初始化定时任务（使用 Bull 队列）...");
      const jobs = await this.selectJobAll();
      let successCount = 0;
      for (const job of jobs) {
        if (job.status === "0") {
          const result = await this.createBullJob(job);
          if (result) successCount++;
        }
      }
      ctx.logger.info(`定时任务初始化完成，共启动 ${successCount} 个任务`);
      return successCount;
    } catch (err) {
      ctx.logger.error("初始化定时任务失败:", err);
      throw err;
    }
  }

  // ==================== Bull 操作（不变） ====================

  async createBullJob(job) {
    const { app, ctx } = this;
    try {
      const jobId = job._id ? job._id.toString() : job.jobId;
      const uniqueId = `${jobId}:${job.invokeTarget}`;
      ctx.logger.info(`[Bull] 准备创建任务 ${job.jobName}, uniqueId: ${uniqueId}, cron: ${job.cronExpression}`);

      try {
        await app.queue.ryTask.removeRepeatable({ cron: job.cronExpression, key: uniqueId });
      } catch (err) {
        ctx.logger.debug(`[Bull] 未找到旧任务（新格式）: ${err.message}`);
      }

      const repeatableJobs = await app.queue.ryTask.getRepeatableJobs();
      for (const repeatJob of repeatableJobs) {
        if (repeatJob.id && repeatJob.id.includes(`${jobId}:`)) {
          try { await app.queue.ryTask.removeRepeatable({ cron: repeatJob.cron, key: repeatJob.id || undefined }); }
          catch (err) { ctx.logger.warn(`[Bull] 删除旧任务失败: ${err.message}`); }
          break;
        }
      }

      await app.queue.ryTask.add(
        { invokeTarget: job.invokeTarget, jobInfo: { jobId, jobName: job.jobName, jobGroup: job.jobGroup, uniqueId } },
        { jobId: uniqueId, repeat: { cron: job.cronExpression, key: uniqueId }, removeOnComplete: true, removeOnFail: 100 }
      );

      ctx.logger.info(`[Bull] 创建定时任务成功: ${job.jobName} (${job.cronExpression})`);
      return true;
    } catch (err) {
      ctx.logger.error(`[Bull] 创建定时任务失败: ${job.jobName}`, err);
      return false;
    }
  }

  async updateBullJob(newJob, oldJob) {
    try {
      if (oldJob) await this.deleteBullJob(oldJob);
      if (newJob.status === "0") return await this.createBullJob(newJob);
      return true;
    } catch (err) {
      this.ctx.logger.error(`[Bull] 更新定时任务失败: ${newJob.jobName}`, err);
      return false;
    }
  }

  async deleteBullJob(job) {
    const { app, ctx } = this;
    try {
      const jobId = job._id ? job._id.toString() : job.jobId;
      const uniqueId = `${jobId}:${job.invokeTarget}`;
      const repeatableJobs = await app.queue.ryTask.getRepeatableJobs();

      let deleted = false;
      for (const repeatJob of repeatableJobs) {
        if (repeatJob.key && repeatJob.key.includes(uniqueId)) {
          await app.queue.ryTask.removeRepeatableByKey(repeatJob.key);
          ctx.logger.info(`[Bull] 删除定时任务成功: ${job.jobName}`);
          deleted = true;
          break;
        }
      }

      if (!deleted) {
        for (const repeatJob of repeatableJobs) {
          if (repeatJob.cron === job.cronExpression) {
            await app.queue.ryTask.removeRepeatableByKey(repeatJob.key);
            ctx.logger.info(`[Bull] 删除定时任务成功: ${job.jobName}`);
            deleted = true;
            break;
          }
        }
      }
      return true;
    } catch (err) {
      ctx.logger.error(`[Bull] 删除定时任务失败: ${job.jobName}`, err);
      return false;
    }
  }

  async runBullJob(job) {
    const { app, ctx } = this;
    try {
      const jobId = job._id ? job._id.toString() : job.jobId;
      await app.queue.ryTask.add(
        { invokeTarget: job.invokeTarget, jobInfo: { jobId, jobName: job.jobName, jobGroup: job.jobGroup } },
        { removeOnComplete: true, priority: 1 }
      );
      ctx.logger.info(`[Bull] 手动执行任务: ${job.jobName}`);
      return true;
    } catch (err) {
      ctx.logger.error(`[Bull] 手动执行任务失败: ${job.jobName}`, err);
      return false;
    }
  }

  async pauseBullJob(job) { return await this.deleteBullJob(job); }
  async resumeBullJob(job) { return await this.createBullJob(job); }
}

module.exports = JobService;
