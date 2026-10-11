"use strict";
(() => {
var exports = {};
exports.id = "app/api/chat/rooms/[roomId]/messages/route";
exports.ids = ["app/api/chat/rooms/[roomId]/messages/route"];
exports.modules = {

/***/ "@prisma/client":
/*!*********************************!*\
  !*** external "@prisma/client" ***!
  \*********************************/
/***/ ((module) => {

module.exports = require("@prisma/client");

/***/ }),

/***/ "../../client/components/action-async-storage.external":
/*!*******************************************************************************!*\
  !*** external "next/dist/client/components/action-async-storage.external.js" ***!
  \*******************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/action-async-storage.external.js");

/***/ }),

/***/ "../../client/components/request-async-storage.external":
/*!********************************************************************************!*\
  !*** external "next/dist/client/components/request-async-storage.external.js" ***!
  \********************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/request-async-storage.external.js");

/***/ }),

/***/ "../../client/components/static-generation-async-storage.external":
/*!******************************************************************************************!*\
  !*** external "next/dist/client/components/static-generation-async-storage.external.js" ***!
  \******************************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/client/components/static-generation-async-storage.external.js");

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

/***/ "assert":
/*!*************************!*\
  !*** external "assert" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("assert");

/***/ }),

/***/ "buffer":
/*!*************************!*\
  !*** external "buffer" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("buffer");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("crypto");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&page=%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&page=%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
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
/* harmony import */ var _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_chat_rooms_roomId_messages_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/chat/rooms/[roomId]/messages/route.ts */ "(rsc)/./app/api/chat/rooms/[roomId]/messages/route.ts");




// We inject the nextConfigOutput here so that we can use them in the route
// module.
const nextConfigOutput = ""
const routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({
    definition: {
        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,
        page: "/api/chat/rooms/[roomId]/messages/route",
        pathname: "/api/chat/rooms/[roomId]/messages",
        filename: "route",
        bundlePath: "app/api/chat/rooms/[roomId]/messages/route"
    },
    resolvedPagePath: "/home/ubuntu/fortune_telling_platform/nextjs_space/app/api/chat/rooms/[roomId]/messages/route.ts",
    nextConfigOutput,
    userland: _home_ubuntu_fortune_telling_platform_nextjs_space_app_api_chat_rooms_roomId_messages_route_ts__WEBPACK_IMPORTED_MODULE_3__
});
// Pull out the exports that we need to expose from the module. This should
// be eliminated when we've moved the other routes to the new format. These
// are used to hook into the route.
const { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;
const originalPathname = "/api/chat/rooms/[roomId]/messages/route";
function patchFetch() {
    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({
        serverHooks,
        staticGenerationAsyncStorage
    });
}


//# sourceMappingURL=app-route.js.map

/***/ }),

/***/ "(rsc)/./app/api/chat/rooms/[roomId]/messages/route.ts":
/*!*******************************************************!*\
  !*** ./app/api/chat/rooms/[roomId]/messages/route.ts ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   GET: () => (/* binding */ GET),
/* harmony export */   POST: () => (/* binding */ POST),
/* harmony export */   dynamic: () => (/* binding */ dynamic)
/* harmony export */ });
/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/api/server.js");
/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next-auth */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next-auth/index.js");
/* harmony import */ var next_auth__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_auth__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _lib_auth_options__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/auth-options */ "(rsc)/./lib/auth-options.ts");
/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @/lib/db */ "(rsc)/./lib/db.ts");
/* harmony import */ var _lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @/lib/chat-permissions */ "(rsc)/./lib/chat-permissions.ts");





const dynamic = "force-dynamic";
// GET messages for a room
async function GET(request, { params }) {
    try {
        const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_lib_auth_options__WEBPACK_IMPORTED_MODULE_2__.authOptions);
        const { roomId } = await params;
        const { searchParams } = new URL(request.url);
        const after = searchParams.get("after") // For polling new messages
        ;
        const limit = parseInt(searchParams.get("limit") || "50");
        // Check if user is banned (if logged in)
        if (session?.user?.id) {
            const banned = await (0,_lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.isUserBanned)(roomId, session.user.id);
            if (banned) {
                return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                    error: "You are banned from this room"
                }, {
                    status: 403
                });
            }
        }
        const whereClause = {
            roomId
        };
        if (after) {
            whereClause.createdAt = {
                gt: new Date(after)
            };
        }
        const messages = await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatMessage.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: after ? "asc" : "desc"
            },
            take: after ? 100 : limit
        });
        // Get user roles and nicknames for all message authors
        const userIds = [
            ...new Set(messages.map((m)=>m.userId))
        ];
        const [userRoles, userPresences] = await Promise.all([
            _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatUserRole.findMany({
                where: {
                    roomId,
                    userId: {
                        in: userIds
                    }
                }
            }),
            _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatPresence.findMany({
                where: {
                    roomId,
                    userId: {
                        in: userIds
                    }
                },
                select: {
                    userId: true,
                    nickname: true
                }
            })
        ]);
        const roleMap = new Map(userRoles.map((r)=>[
                r.userId,
                r.role
            ]));
        const nicknameMap = new Map(userPresences.map((p)=>[
                p.userId,
                p.nickname
            ]));
        // Add role symbol and nickname to messages
        const messagesWithRoles = messages.map((msg)=>{
            const chatRole = roleMap.get(msg.userId) || (msg.user.role === "admin" ? "founder" : null);
            const roleSymbol = chatRole ? _lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.ROLE_SYMBOLS[chatRole] || "" : "";
            const nickname = nicknameMap.get(msg.userId) || msg.user.name;
            return {
                ...msg,
                user: {
                    ...msg.user,
                    nickname,
                    chatRole,
                    roleSymbol
                }
            };
        });
        // If not polling (initial load), reverse to show oldest first
        const orderedMessages = after ? messagesWithRoles : messagesWithRoles.reverse();
        // Get room muted status and user permissions
        const room = await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatRoom.findUnique({
            where: {
                id: roomId
            },
            select: {
                isMuted: true
            }
        });
        // Get user permissions if logged in
        let myPermissions = null;
        let myNickname = null;
        if (session?.user?.id) {
            myPermissions = await (0,_lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.getUserPermissions)(roomId, session.user.id);
            const presence = await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatPresence.findUnique({
                where: {
                    roomId_userId: {
                        roomId,
                        userId: session.user.id
                    }
                },
                select: {
                    nickname: true
                }
            });
            myNickname = presence?.nickname || session.user.name;
        }
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            messages: orderedMessages,
            roomMuted: room?.isMuted || false,
            myPermissions,
            myNickname
        });
    } catch (error) {
        console.error("Error fetching messages:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            error: "Failed to fetch messages"
        }, {
            status: 500
        });
    }
}
// POST a new message
async function POST(request, { params }) {
    try {
        const session = await (0,next_auth__WEBPACK_IMPORTED_MODULE_1__.getServerSession)(_lib_auth_options__WEBPACK_IMPORTED_MODULE_2__.authOptions);
        if (!session?.user?.id) {
            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                error: "Unauthorized"
            }, {
                status: 401
            });
        }
        const { roomId } = await params;
        const { content, nickname } = await request.json();
        // Check if user can speak
        const speakCheck = await (0,_lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.canUserSpeak)(roomId, session.user.id);
        if (!speakCheck.canSpeak) {
            const errorMessages = {
                banned: "You are banned from this room",
                muted: "You are muted in this room",
                room_muted: "Room is muted. Only users with voice (+) or higher can speak."
            };
            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                error: errorMessages[speakCheck.reason || ""] || "Cannot speak"
            }, {
                status: 403
            });
        }
        if (!content || content.trim().length === 0) {
            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                error: "Message content is required"
            }, {
                status: 400
            });
        }
        if (content.length > 500) {
            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                error: "Message too long (max 500 characters)"
            }, {
                status: 400
            });
        }
        // Verify room exists
        const room = await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatRoom.findUnique({
            where: {
                id: roomId
            }
        });
        if (!room) {
            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
                error: "Room not found"
            }, {
                status: 404
            });
        }
        // Get user's role for the response
        const userRole = await (0,_lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.getUserRole)(roomId, session.user.id);
        const roleSymbol = userRole !== "none" ? _lib_chat_permissions__WEBPACK_IMPORTED_MODULE_4__.ROLE_SYMBOLS[userRole] || "" : "";
        // Create message
        const message = await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatMessage.create({
            data: {
                roomId,
                userId: session.user.id,
                content: content.trim()
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        role: true
                    }
                }
            }
        });
        // Update presence
        await _lib_db__WEBPACK_IMPORTED_MODULE_3__["default"].chatPresence.upsert({
            where: {
                roomId_userId: {
                    roomId,
                    userId: session.user.id
                }
            },
            update: {
                lastSeen: new Date()
            },
            create: {
                roomId,
                userId: session.user.id
            }
        });
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            ...message,
            user: {
                ...message.user,
                chatRole: userRole !== "none" ? userRole : null,
                roleSymbol
            }
        });
    } catch (error) {
        console.error("Error sending message:", error);
        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({
            error: "Failed to send message"
        }, {
            status: 500
        });
    }
}


/***/ }),

/***/ "(rsc)/./lib/auth-options.ts":
/*!*****************************!*\
  !*** ./lib/auth-options.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   authOptions: () => (/* binding */ authOptions)
/* harmony export */ });
/* harmony import */ var next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next-auth/providers/credentials */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next-auth/providers/credentials.js");
/* harmony import */ var _next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @next-auth/prisma-adapter */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/@next-auth/prisma-adapter/dist/index.js");
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! bcryptjs */ "(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/bcryptjs/index.js");
/* harmony import */ var bcryptjs__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(bcryptjs__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _db__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./db */ "(rsc)/./lib/db.ts");




const authOptions = {
    adapter: (0,_next_auth_prisma_adapter__WEBPACK_IMPORTED_MODULE_1__.PrismaAdapter)(_db__WEBPACK_IMPORTED_MODULE_3__["default"]),
    providers: [
        // Google SSO - Şimdilik pasif
        // GoogleProvider({
        //   clientId: process.env.GOOGLE_CLIENT_ID || '',
        //   clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        //   allowDangerousEmailAccountLinking: true,
        // }),
        (0,next_auth_providers_credentials__WEBPACK_IMPORTED_MODULE_0__["default"])({
            name: "Credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email"
                },
                password: {
                    label: "Password",
                    type: "password"
                }
            },
            async authorize (credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }
                const user = await _db__WEBPACK_IMPORTED_MODULE_3__["default"].user.findUnique({
                    where: {
                        email: credentials.email
                    }
                });
                if (!user || !user?.password) {
                    throw new Error("Invalid credentials");
                }
                const isPasswordValid = await bcryptjs__WEBPACK_IMPORTED_MODULE_2___default().compare(credentials.password, user.password);
                if (!isPasswordValid) {
                    throw new Error("Invalid credentials");
                }
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                    credits: user.credits,
                    preferredLanguage: user.preferredLanguage
                };
            }
        })
    ],
    callbacks: {
        async jwt ({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role || "user";
                token.credits = user.credits ?? 10;
                token.preferredLanguage = user.preferredLanguage || "tr";
                token.image = user.image;
            }
            // Update token when session is updated
            if (trigger === "update" && session) {
                token.credits = session?.credits;
                token.preferredLanguage = session?.preferredLanguage;
            }
            return token;
        },
        async session ({ session, token }) {
            if (session?.user) {
                session.user.id = token?.id || token?.sub || "";
                session.user.role = token?.role || "user";
                session.user.credits = token?.credits ?? 10;
                session.user.preferredLanguage = token?.preferredLanguage || "tr";
                session.user.image = token?.image || null;
            }
            return session;
        },
        async redirect ({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        }
    },
    pages: {
        signIn: "/tr/login"
    },
    session: {
        strategy: "jwt"
    },
    cookies: {
        state: {
            name: "next-auth.state",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: "development" === "production"
            }
        },
        pkceCodeVerifier: {
            name: "next-auth.pkce.code_verifier",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: "development" === "production"
            }
        }
    },
    secret: process.env.NEXTAUTH_SECRET
};


/***/ }),

/***/ "(rsc)/./lib/chat-permissions.ts":
/*!*********************************!*\
  !*** ./lib/chat-permissions.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   ROLE_HIERARCHY: () => (/* binding */ ROLE_HIERARCHY),
/* harmony export */   ROLE_SYMBOLS: () => (/* binding */ ROLE_SYMBOLS),
/* harmony export */   canUserSpeak: () => (/* binding */ canUserSpeak),
/* harmony export */   getUserPermissions: () => (/* binding */ getUserPermissions),
/* harmony export */   getUserRole: () => (/* binding */ getUserRole),
/* harmony export */   isUserBanned: () => (/* binding */ isUserBanned)
/* harmony export */ });
/* harmony import */ var _lib_db__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/lib/db */ "(rsc)/./lib/db.ts");

// Role hierarchy: founder (~) > admin (&) > op (@) > voice (+)
const ROLE_HIERARCHY = {
    founder: 4,
    admin: 3,
    op: 2,
    voice: 1,
    none: 0
};
const ROLE_SYMBOLS = {
    founder: "~",
    admin: "&",
    op: "@",
    voice: "+"
};
async function getUserRole(roomId, userId) {
    // Check if user is global admin (site admin)
    const user = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].user.findUnique({
        where: {
            id: userId
        },
        select: {
            role: true
        }
    });
    if (user?.role === "admin") {
        return "founder" // Site admin has founder rights in all rooms
        ;
    }
    // Check if user is room owner - room owners have founder rights
    const room = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatRoom.findUnique({
        where: {
            id: roomId
        },
        select: {
            ownerId: true
        }
    });
    if (room?.ownerId === userId) {
        return "founder" // Room owner has founder rights in their room
        ;
    }
    const userRole = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatUserRole.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId
            }
        }
    });
    return userRole?.role || "none";
}
async function getUserPermissions(roomId, userId) {
    const user = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].user.findUnique({
        where: {
            id: userId
        },
        select: {
            role: true
        }
    });
    const isGlobalAdmin = user?.role === "admin";
    // Check if user is room owner
    const room = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatRoom.findUnique({
        where: {
            id: roomId
        },
        select: {
            ownerId: true
        }
    });
    const isRoomOwner = room?.ownerId === userId;
    const role = await getUserRole(roomId, userId);
    const roleLevel = ROLE_HIERARCHY[role];
    return {
        role,
        isGlobalAdmin,
        isRoomOwner,
        // @ and above can mute users (room owner always can)
        canMuteUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.op,
        // ~ can kick users (room owner always can)
        canKickUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
        // & and above can ban users (room owner always can)
        canBanUsers: isRoomOwner || roleLevel >= ROLE_HIERARCHY.admin,
        // & and above can mute the room (room owner always can)
        canMuteRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.admin,
        // ~ can give voice when room is muted (room owner always can)
        canGiveVoice: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
        // ~ can give op (room owner always can)
        canGiveOp: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
        // ~ can give admin (room owner always can)
        canGiveAdmin: isRoomOwner || roleLevel >= ROLE_HIERARCHY.founder,
        // Only global admin can give founder
        canGiveFounder: isGlobalAdmin,
        // + and above can speak in muted room (room owner always can)
        canSpeakInMutedRoom: isRoomOwner || roleLevel >= ROLE_HIERARCHY.voice
    };
}
async function canUserSpeak(roomId, userId) {
    // Check if user is banned
    const ban = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatBan.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId
            }
        }
    });
    if (ban) {
        if (!ban.expiresAt || ban.expiresAt > new Date()) {
            return {
                canSpeak: false,
                reason: "banned"
            };
        }
        // Ban expired, remove it
        await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatBan.delete({
            where: {
                id: ban.id
            }
        });
    }
    // Check if user is muted
    const mute = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatMute.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId
            }
        }
    });
    if (mute) {
        if (!mute.expiresAt || mute.expiresAt > new Date()) {
            return {
                canSpeak: false,
                reason: "muted"
            };
        }
        // Mute expired, remove it
        await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatMute.delete({
            where: {
                id: mute.id
            }
        });
    }
    // Check if room is muted
    const room = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatRoom.findUnique({
        where: {
            id: roomId
        },
        select: {
            isMuted: true
        }
    });
    if (room?.isMuted) {
        const permissions = await getUserPermissions(roomId, userId);
        if (!permissions.canSpeakInMutedRoom) {
            return {
                canSpeak: false,
                reason: "room_muted"
            };
        }
    }
    return {
        canSpeak: true
    };
}
async function isUserBanned(roomId, userId) {
    const ban = await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatBan.findUnique({
        where: {
            roomId_userId: {
                roomId,
                userId
            }
        }
    });
    if (ban) {
        if (!ban.expiresAt || ban.expiresAt > new Date()) {
            return true;
        }
        // Ban expired, remove it
        await _lib_db__WEBPACK_IMPORTED_MODULE_0__["default"].chatBan.delete({
            where: {
                id: ban.id
            }
        });
    }
    return false;
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
var __webpack_require__ = require("../../../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/next-auth","vendor-chunks/@babel","vendor-chunks/jose","vendor-chunks/openid-client","vendor-chunks/bcryptjs","vendor-chunks/oauth","vendor-chunks/object-hash","vendor-chunks/preact","vendor-chunks/uuid","vendor-chunks/@next-auth","vendor-chunks/yallist","vendor-chunks/preact-render-to-string","vendor-chunks/lru-cache","vendor-chunks/oidc-token-hash","vendor-chunks/@panva"], () => (__webpack_exec__("(rsc)/../../../../opt/hostedapp/node/root/app/node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&page=%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fchat%2Frooms%2F%5BroomId%5D%2Fmessages%2Froute.ts&appDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2Fhome%2Fubuntu%2Ffortune_telling_platform%2Fnextjs_space&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();