const WorkBuddyPublicConfig = {
  resourceId: "wbcs_7nl1qm01TNPKJdiLvpgK7C",
  endpoint: "https://campus-mutual-aid-00460.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey: "wbpk_Ps8N7U2w22keXi2LW28DCX_QYxsIp4pUIgE8sgiQHibJRdzOPPt4yHk",
};

window.Cloud = (() => {
  let instance = null;

  function get() {
    if (instance) return instance;
    const sdk = window.WorkBuddyCloud;
    if (!sdk || typeof sdk.createWorkBuddyCloud !== "function") {
      throw new Error("云服务组件未加载，请检查网络后刷新页面");
    }
    instance = sdk.createWorkBuddyCloud({
      endpoint: WorkBuddyPublicConfig.endpoint,
      oauthRelayBaseUrl: WorkBuddyPublicConfig.oauthRelayBaseUrl,
      publishableKey: WorkBuddyPublicConfig.publishableKey,
    });
    return instance;
  }

  return { get, publicConfig: WorkBuddyPublicConfig };
})();
