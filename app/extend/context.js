/**
 * Extend ctx with unified response helpers.
 *
 * All API responses follow the format: { code, success, message, data }
 * The formatBody middleware will NOT re-wrap these responses because
 * they already contain a `code` field.
 */
module.exports = {
  /**
   * Success response
   */
  success(data = null, message = '操作成功') {
    this.body = {
      code: 200,
      success: true,
      message,
      data,
    };
  },

  /**
   * Error response
   */
  error(message = '操作失败', code = 500) {
    this.status = code;
    this.body = {
      code,
      success: false,
      message,
      data: null,
    };
  },

  /**
   * Paginated response
   */
  page(list = [], total = 0, page = 1, pageSize = 10, message = '操作成功') {
    this.body = {
      code: 200,
      success: true,
      message,
      data: {
        list,
        total,
        page,
        pageSize,
        pages: Math.ceil(total / pageSize),
      },
    };
  },
};
