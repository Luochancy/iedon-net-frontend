/*
*******************************************************************
router.ts

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
*/
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const pageRoutes: RouteRecordRaw[] = [
  {
    name: "index",
    path: "/",
    component: () => import('./pages/landing/landing.vue')
  },
  {
    name: "signin",
    path: "/signin",
    component: () => import('./pages/signin/signin.vue')
  },
  {
    name: "openAuth",
    path: "/openAuth",
    component: () => import('./pages/openAuth/openAuth.vue')
  },
  {
    name: "nodes",
    path: "/nodes",
    component: () => import('./pages/nodes/nodes.vue')
  },
  {
    name: "about",
    path: "/about",
    component: () => import('./pages/about/about.vue')
  },  {
    name: "peering",
    path: "/nodes/:uuid",
    component: () => import('./pages/nodes/peering.vue')
  },
  {
    name: "health",
    path: "/health",
    component: () => import('./pages/nodes/health.vue'),
  },
  {
    name: "editSession",
    path: "/nodes/:uuid/edit/:sessionId",
    component: () => import('./pages/nodes/peering.vue')
  },{
    name: "manage",
    path: "/manage",
    component: () => import('./pages/manage/manage.vue')
  },
  {
    name: "sessionMetrics",
    path: "/manage/metrics/:routerId/:sessionId",
    component: () => import('./pages/manage/sessionMetrics.vue')
  },
  {
    name: "adminNodes",
    path: "/admin/nodes",
    component: () => import('./pages/admin/nodes.vue')
  },
  {
    name: "adminNodeDetail",
    path: "/admin/nodes/:uuid",
    component: () => import('./pages/admin/nodeDetail.vue')
  },
  {
    name: "lg",
    path: "/lg",
    component: () => import('./pages/lg/lg.vue')
  },
  {
    name: "lgDetail",
    path: "/lg/:routerUuid/:protocolName",
    component: () => import('./pages/lg/lgDetail.vue')
  },
]

const routerHistory = createWebHistory()

const router = createRouter({
  history: routerHistory,
  routes: pageRoutes,
  scrollBehavior(to, from, savedPosition) {
    // Smooth scroll behavior for SPA navigation
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

export default router
