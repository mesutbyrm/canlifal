"use strict";
(() => {
var exports = {};
exports.id = "app/api/homepage-ticker/route";
exports.ids = ["app/api/homepage-ticker/route"];
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

/***/ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fhomepage-ticker%2Froute&page=%2Fapi%2Fhomepage-ticker%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhomepage-ticker%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fhomepage-ticker%2Froute&page=%2Fapi%2Fhomepage-ticker%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhomepage-ticker%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
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
/* harmony import */ var _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_homepage_ticker_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/homepage-ticker/route.ts */ "(rsc)/./app/api/homepage-ticker/route.ts");




// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,
        page: "/api/homepage-ticker/route",
        pathname: "/api/homepage-ticker",
        filename: "route",
        bundlePath: "app/api/homepage-ticker/route"
    },
    resolvedPagePath: "/home/ubuntu/fortune_telling_platform/nextjs_space/app/api/homepage-ticker/route.ts",
    nextConfigOutput,
    userland: _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_homepage_ticker_route_ts__WEBPACK_IMPORTED_MODULE_3__
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;
const originalPathname = "/api/homepage-ticker/route";
function patchFetch() {
    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({
        serverHooks,
        staticGenerationAsyncStorage
    });
}


//# sourceMappingURL=app-route.js.map

/***/ }),

/***/ "(rsc)/./app/api/homepage-ticker/route.ts":
/*!******************************************!*\
  !*** ./app/api/homepage-ticker/route.ts ***!
  \******************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GET: () => (/* binding */ GET),
/* harmony export */   dynamic: () => (/* binding */ dynamic)
/* harmony export */ });
/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/api/server.js");
/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/lib/db */ "(rsc)/./lib/db.ts");


const dynamic = "force-dynamic";
async function GET() {
    try {
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        // 1. Online users (active in last 5 minutes)
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        // Get total count of online registered users
        const onlineRegisteredCount = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.user.count({
            where: {
                lastActiveAt: {
                    gte: fiveMinutesAgo
                }
            }
        });
        const onlineUsers = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.user.findMany({
            where: {
                lastActiveAt: {
                    gte: fiveMinutesAgo
                }
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true
            },
            take: 20,
            orderBy: {
                lastActiveAt: "desc"
            }
        });
        // Get guest visitors (SitePresence without userId, active in last 2 minutes)
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
        const guestPresences = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.sitePresence.findMany({
            where: {
                userId: null,
                lastSeen: {
                    gte: twoMinutesAgo
                }
            },
            select: {
                visitorId: true,
                lastSeen: true
            },
            take: 30,
            orderBy: {
                lastSeen: "desc"
            }
        });
        // Create guest user entries as "faluser"
        const guestUsers = guestPresences.map((guest, index)=>({
                id: `guest-${guest.visitorId}`,
                name: `faluser${index + 1}`,
                username: null,
                image: null,
                isGuest: true
            }));
        // Total online count includes both registered users and guests
        const onlineCount = onlineRegisteredCount + guestPresences.length;
        // Combine registered users and guests for display
        const allOnlineUsers = [
            ...onlineUsers.map((u)=>({
                    ...u,
                    isGuest: false
                })),
            ...guestUsers
        ];
        // 2. Recent credit purchasers (last 24 hours)
        const recentPurchases = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.creditTransaction.findMany({
            where: {
                type: "purchase",
                amount: {
                    gt: 0
                },
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            select: {
                id: true,
                userId: true,
                amount: true,
                createdAt: true
            },
            take: 20,
            orderBy: {
                createdAt: "desc"
            }
        });
        // Get user info for purchasers
        const purchaserIds = recentPurchases.map((p)=>p.userId);
        const purchasers = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.user.findMany({
            where: {
                id: {
                    in: purchaserIds
                }
            },
            select: {
                id: true,
                name: true,
                username: true,
                image: true
            }
        });
        const purchasersMap = new Map(purchasers.map((p)=>[
                p.id,
                p
            ]));
        const recentPurchasersWithInfo = recentPurchases.map((p)=>({
                ...p,
                user: purchasersMap.get(p.userId) || {
                    id: p.userId,
                    name: "Kullanıcı",
                    username: null,
                    image: null
                }
            }));
        // 3. Big gifts (1000+ in single transaction) in last 24 hours
        const bigGifts = await _lib_db__WEBPACK_IMPORTED_MODULE_1__.prisma.streamGift.findMany({
            where: {
                totalPrice: {
                    gte: 1000
                },
                createdAt: {
                    gte: twentyFourHoursAgo
                }
            },
            select: {
                id: true,
                totalPrice: true,
                createdAt: true,
                sender: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                stream: {
                    select: {
                        id: true,
                        title: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                image: true
                            }
                        }
                    }
                },
                giftType: {
                    select: {
                        name: true,
                        icon: true
                    }
                }
            },
            take: 20,
            orderBy: {
                totalPrice: "desc"
            }
        });
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            onlineUsers: allOnlineUsers,
            onlineCount,
            recentPurchasers: recentPurchasersWithInfo,
            bigGifts
        });
    } catch (error) {
        console.error("Homepage ticker error:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            onlineUsers: [],
            onlineCount: 0,
            recentPurchasers: [],
            bigGifts: []
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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next"], () => (__webpack_exec__("(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fhomepage-ticker%2Froute&page=%2Fapi%2Fhomepage-ticker%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhomepage-ticker%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();