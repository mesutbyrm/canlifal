"use strict";
(() => {
var exports = {};
exports.id = "app/api/gifts/recent-big/route";
exports.ids = ["app/api/gifts/recent-big/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgifts%2Frecent-big%2Froute&page=%2Fapi%2Fgifts%2Frecent-big%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgifts%2Frecent-big%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgifts%2Frecent-big%2Froute&page=%2Fapi%2Fgifts%2Frecent-big%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgifts%2Frecent-big%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   originalPathname: () => (/* binding */ originalPathname),
/* harmony export */   patchFetch: () => (/* binding */ patchFetch),
/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),
/* harmony export */   routeModule: () => (/* binding */ routeModule),
/* harmony export */   serverHooks: () => (/* binding */ serverHooks),
/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)
/* harmony export */ });
/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js");
/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/server/future/route-kind.js");
/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/server/lib/patch-fetch.js");
/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_gifts_recent_big_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/gifts/recent-big/route.ts */ "(rsc)/./app/api/gifts/recent-big/route.ts");




// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,
        page: "/api/gifts/recent-big/route",
        pathname: "/api/gifts/recent-big",
        filename: "route",
        bundlePath: "app/api/gifts/recent-big/route"
    },
    resolvedPagePath: "/home/ubuntu/fortune_telling_platform/nextjs_space/app/api/gifts/recent-big/route.ts",
    nextConfigOutput,
    userland: _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_gifts_recent_big_route_ts__WEBPACK_IMPORTED_MODULE_3__
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;
const originalPathname = "/api/gifts/recent-big/route";
function patchFetch() {
    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({
        serverHooks,
        staticGenerationAsyncStorage
    });
}


//# sourceMappingURL=app-route.js.map

/***/ }),

/***/ "(rsc)/./app/api/gifts/recent-big/route.ts":
/*!*******************************************!*\
  !*** ./app/api/gifts/recent-big/route.ts ***!
  \*******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GET: () => (/* binding */ GET)
/* harmony export */ });
/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/api/server.js");
/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/db */ "(rsc)/./lib/db.ts");


// Returns recent high-value gifts (lion gifts or 1000+ jeton gifts) from the last 15 minutes
async function GET() {
    try {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        // Get recent gift_received notifications that are high value
        const recentGiftNotifs = await _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].notification.findMany({
            where: {
                type: "gift_received",
                createdAt: {
                    gte: fifteenMinutesAgo
                }
            },
            include: {
                user: {
                    select: {
                        name: true,
                        username: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            },
            take: 20
        });
        const notifications = [];
        for (const notif of recentGiftNotifs){
            if (!notif.data) continue;
            try {
                const data = JSON.parse(notif.data);
                // Check if it's a big jeton gift (1000+)
                if (data.type === "jeton" && data.amount >= 1000) {
                    notifications.push({
                        id: notif.id,
                        senderName: data.senderName || "Anonim",
                        recipientName: notif.user.name || "Anonim",
                        giftType: "Jeton",
                        giftIcon: "\ud83e\ude99",
                        amount: data.amount,
                        createdAt: notif.createdAt.toISOString()
                    });
                } else if (data.giftName) {
                    // Check if this gift is a high-value one (price >= 1000)
                    const giftType = await _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].giftType.findFirst({
                        where: {
                            name: data.giftName,
                            price: {
                                gte: 1000
                            }
                        }
                    });
                    if (giftType) {
                        notifications.push({
                            id: notif.id,
                            senderName: data.senderName || "Anonim",
                            recipientName: notif.user.name || "Anonim",
                            giftType: data.giftName,
                            giftIcon: data.giftIcon || "\ud83e\udd81",
                            amount: giftType.price,
                            createdAt: notif.createdAt.toISOString()
                        });
                    }
                }
            } catch  {
            // Skip malformed data
            }
        }
        // Sort by date desc and return up to 5
        notifications.sort((a, b)=>new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(notifications.slice(0, 5));
    } catch (error) {
        console.error("Recent big gifts error:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json([]);
    }
}


/***/ }),

/***/ "(rsc)/./lib/db.ts":
/*!*******************!*\
  !*** ./lib/db.ts ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   prisma: () => (/* binding */ prisma)
/* harmony export */ });
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @prisma/client */ "@prisma/client");
/* harmony import */ var _prisma_client__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_prisma_client__WEBPACK_IMPORTED_MODULE_0__);
// PostgreSQL database connection with connection pooling

const globalForPrisma = globalThis;
// Create Prisma client with connection pool limits
const createPrismaClient = ()=>{
    // Add connection pool parameters to the DATABASE_URL
    const baseUrl = process.env.DATABASE_URL || "";
    const pooledUrl = baseUrl.includes("?") ? `${baseUrl}&connection_limit=5&pool_timeout=10` : `${baseUrl}?connection_limit=5&pool_timeout=10`;
    return new _prisma_client__WEBPACK_IMPORTED_MODULE_0__.PrismaClient({
        datasources: {
            db: {
                url: pooledUrl
            }
        },
        log:  true ? [
            "warn",
            "error"
        ] : 0
    });
};
const prisma = globalForPrisma.prisma ?? createPrismaClient();
// Always cache in globalThis to prevent creating new clients per request
if (true) {
    globalForPrisma.prisma = prisma;
} else {}
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (prisma);


/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fgifts%2Frecent-big%2Froute&page=%2Fapi%2Fgifts%2Frecent-big%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fgifts%2Frecent-big%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();