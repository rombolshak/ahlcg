export default {
  "/api": {
    target: process.env["services__apiservice__http__0"],
    pathRewrite: {
      "^/api": "",
    },
  },
};
