/*
 * @Description: Helper 扩展
 * @Author: AI Assistant
 * @Date: 2025-10-23
 */

const bcrypt = require("bcryptjs");
const dayjs = require("dayjs");

module.exports = {
  /**
   * 安全工具类
   */
  security: {
    /**
     * 加密密码
     * @param {string} password - 明文密码
     * @return {string} 加密后的密码
     */
    async encryptPassword(password) {
      const salt = await bcrypt.genSalt(10);
      return await bcrypt.hash(password, salt);
    },

    /**
     * 比对密码
     * @param {string} password - 明文密码
     * @param {string} hash - 加密后的密码
     * @return {boolean} 是否匹配
     */
    async comparePassword(password, hash) {
      return await bcrypt.compare(password, hash);
    },
  },

  /**
   * 分页参数处理
   * @param {object} params - 请求参数
   * @return {array} [offset, limit]
   */
  page(params = {}) {
    const pageNum = parseInt(params.pageNum) || 1;
    const pageSize = parseInt(params.pageSize) || 10;
    const offset = (pageNum - 1) * pageSize;
    return [offset, pageSize];
  },

  /**
   * 日期格式化
   * @param {Date|string} date - 日期
   * @param {string} format - 格式
   * @return {string} 格式化后的日期
   */
  formatDate(date, format = "YYYY-MM-DD HH:mm:ss") {
    if (!date) return "";
    return dayjs(date).format(format);
  },

  /**
   * 构建树形结构
   * @param {array} list - 列表数据
   * @param {string} idKey - ID 字段名
   * @param {string} parentKey - 父ID 字段名
   * @param {number} parentId - 父ID
   * @return {array} 树形结构
   */
  buildTree(list, idKey = "id", parentKey = "parentId", parentId = 0) {
    const tree = [];

    list.forEach((item) => {
      if (item[parentKey] === parentId) {
        const children = this.buildTree(list, idKey, parentKey, item[idKey]);
        if (children.length > 0) {
          item.children = children;
        }
        tree.push(item);
      }
    });

    return tree;
  },

  /**
   * 获取客户端 IP
   * @param {object} ctx - 上下文
   * @return {string} IP 地址
   */
  getClientIP(ctx) {
    return (
      ctx.request.ip ||
      ctx.get("x-forwarded-for") ||
      ctx.get("x-real-ip") ||
      "0.0.0.0"
    );
  },

  /**
   * 判断是否为管理员
   * @param {object|string} user - 用户对象或用户名字符串
   * @return {boolean}
   */
  isAdmin(user) {
    if (!user) return false;
    // 支持传入用户对象或用户名字符串
    const userName = typeof user === 'string' ? user : (user.userName || '');
    return userName === 'admin';
  },

  /**
   * MongoDB 分页查询封装
   * @param {import('mongoose').Model} model - Mongoose Model
   * @param {object} filter - MongoDB 查询条件
   * @param {object} params - 请求参数（含 pageNum, pageSize）
   * @param {object} [options] - 额外选项
   * @param {object} [options.sort] - 排序条件
   * @param {string|object} [options.select] - 字段筛选
   * @param {object} [options.populate] - populate 配置
   * @param {string} [options.idField] - ID 字段名（如 'userId', 'roleId'），自动从 _id 映射
   * @return {object} { rows, total }
   */
  async pageQueryMongo(model, filter = {}, params = {}, options = {}) {
    const pageNum = parseInt(params.pageNum) || 1;
    const pageSize = parseInt(params.pageSize) || 10;
    const skip = (pageNum - 1) * pageSize;

    let query = model.find(filter);
    if (options.select) query = query.select(options.select);
    if (options.sort) query = query.sort(options.sort);
    if (options.populate) query = query.populate(options.populate);
    query = query.skip(skip).limit(pageSize).lean();

    const [rows, total] = await Promise.all([
      query,
      model.countDocuments(filter),
    ]);

    // 如果指定了 idField，自动将 _id 映射到该字段
    if (options.idField && rows) {
      for (const row of rows) {
        if (row._id != null) row[options.idField] = row._id;
      }
    }

    return { rows: rows || [], total };
  },

  /**
   * 将 Mongoose 文档列表的 _id 映射到指定的 ID 字段（用于非分页查询）
   * @param {array} docs - Mongoose 文档数组
   * @param {string} idField - ID 字段名（如 'userId', 'roleId'）
   * @return {array} 映射后的文档数组
   */
  normalizeIds(docs, idField) {
    if (!docs || !Array.isArray(docs) || !idField) return docs;
    return docs.map(doc => {
      if (doc && doc._id != null) {
        return { ...doc, [idField]: doc._id };
      }
      return doc;
    });
  },

  // ===================== Coupon Business Helpers =====================

  /**
   * Generate JWT token for coupon (mini-program) users
   * Uses separate appJwt config (not admin JWT)
   */
  generateToken(userId) {
    const { secret, expire } = this.config.appJwt;
    return this.app.jwt.sign({ id: userId }, secret, { expiresIn: expire });
  },

  /**
   * Verify JWT token for coupon (mini-program) users
   */
  verifyToken(token) {
    return this.app.jwt.verify(token, this.config.appJwt.secret);
  },

};
