module.exports = {
  get model() {
    return this.app.model;
  },

  get sequelize() {
    return this.app.sequelize;
  },

  get Sequelize() {
    return this.app.Sequelize;
  },
};
