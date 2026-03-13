"use strict";
(() => {
var exports = {};
exports.id = "app/api/public-stats/route";
exports.ids = ["app/api/public-stats/route"];
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

/***/ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fpublic-stats%2Froute&page=%2Fapi%2Fpublic-stats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fpublic-stats%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fpublic-stats%2Froute&page=%2Fapi%2Fpublic-stats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fpublic-stats%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
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
/* harmony import */ var _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_public_stats_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/public-stats/route.ts */ "(rsc)/./app/api/public-stats/route.ts");




// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,
        page: "/api/public-stats/route",
        pathname: "/api/public-stats",
        filename: "route",
        bundlePath: "app/api/public-stats/route"
    },
    resolvedPagePath: "/home/ubuntu/fortune_telling_platform/nextjs_space/app/api/public-stats/route.ts",
    nextConfigOutput,
    userland: _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_public_stats_route_ts__WEBPACK_IMPORTED_MODULE_3__
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;
const originalPathname = "/api/public-stats/route";
function patchFetch() {
    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({
        serverHooks,
        staticGenerationAsyncStorage
    });
}


//# sourceMappingURL=app-route.js.map

/***/ }),

/***/ "(rsc)/./app/api/public-stats/route.ts":
/*!***************************************!*\
  !*** ./app/api/public-stats/route.ts ***!
  \***************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GET: () => (/* binding */ GET),
/* harmony export */   dynamic: () => (/* binding */ dynamic)
/* harmony export */ });
/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/api/server.js");
/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/db */ "(rsc)/./lib/db.ts");


const dynamic = "force-dynamic";
// Simple in-memory cache to avoid hammering DB on every request
let cachedResult = null;
let cacheTime = 0;
const CACHE_TTL = 15000; // 15 seconds
async function GET() {
    // Return cached result if fresh
    const currentMs = Date.now();
    if (cachedResult && currentMs - cacheTime < CACHE_TTL) {
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(cachedResult);
    }
    try {
        const now = new Date();
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // Get all statistics in parallel
        const [fortuneStats, totalFortunes, chatRooms, socialPostsCount, socialActiveUsers, totalUsers, activeVideoStreams, sitePresenceCount] = await Promise.all([
            // Fortune statistics by type
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].fortune.groupBy({
                by: [
                    "fortuneType"
                ],
                _count: {
                    fortuneType: true
                }
            }),
            // Total fortunes
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].fortune.count(),
            // Chat rooms with presence count
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].chatRoom.findMany({
                select: {
                    id: true,
                    slug: true,
                    nameEn: true,
                    nameTr: true,
                    icon: true
                }
            }),
            // Total social posts
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].socialPost.count(),
            // Active social users (posted in last 24 hours)
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].socialPost.groupBy({
                by: [
                    "userId"
                ],
                where: {
                    createdAt: {
                        gte: oneDayAgo
                    }
                }
            }).then((r)=>r.length),
            // Total registered users
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].user.count(),
            // Active video streams and their viewer counts
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].videoStream.findMany({
                where: {
                    status: "live",
                    endedAt: null
                },
                select: {
                    viewerCount: true
                }
            }),
            // Site-wide presence count (all visitors)
            _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].sitePresence.count({
                where: {
                    lastSeen: {
                        gte: twoMinutesAgo
                    }
                }
            })
        ]);
        // Get chat presence for each room
        const chatPresences = await _lib_db__WEBPACK_IMPORTED_MODULE_1__["default"].chatPresence.groupBy({
            by: [
                "roomId"
            ],
            where: {
                lastSeen: {
                    gte: twoMinutesAgo
                }
            },
            _count: {
                roomId: true
            }
        });
        // Map presence counts to rooms
        const presenceMap = new Map(chatPresences.map((p)=>[
                p.roomId,
                p._count.roomId
            ]));
        const chatRoomsWithPresence = chatRooms.map((room)=>({
                ...room,
                onlineCount: presenceMap.get(room.id) || 0
            }));
        // Total online in chat
        const totalChatOnline = chatPresences.reduce((sum, p)=>sum + p._count.roomId, 0);
        // Total video stream viewers
        const totalVideoViewers = activeVideoStreams.reduce((sum, s)=>sum + s.viewerCount, 0);
        // Total online = site presence count (most accurate) or fallback to chat + video
        const totalOnline = Math.max(1, sitePresenceCount || totalChatOnline + totalVideoViewers);
        // Format fortune stats
        const fortunesByType = {};
        fortuneStats.forEach((stat)=>{
            fortunesByType[stat.fortuneType] = stat._count.fortuneType;
        });
        const result = {
            fortunes: {
                total: totalFortunes,
                byType: fortunesByType
            },
            chat: {
                rooms: chatRoomsWithPresence,
                totalOnline: totalChatOnline
            },
            video: {
                activeStreams: activeVideoStreams.length,
                totalViewers: totalVideoViewers
            },
            social: {
                totalPosts: socialPostsCount,
                activeUsers: socialActiveUsers
            },
            users: {
                total: totalUsers
            },
            totalOnline
        };
        // Cache the result
        cachedResult = result;
        cacheTime = Date.now();
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(result);
    } catch (error) {
        console.error("Public stats error:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            fortunes: {
                total: 0,
                byType: {}
            },
            chat: {
                rooms: [],
                totalOnline: 0
            },
            video: {
                activeStreams: 0,
                totalViewers: 0
            },
            social: {
                totalPosts: 0,
                activeUsers: 0
            },
            users: {
                total: 0
            },
            totalOnline: 1
        });
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
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fpublic-stats%2Froute&page=%2Fapi%2Fpublic-stats%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fpublic-stats%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();