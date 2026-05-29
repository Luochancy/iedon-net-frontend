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
    name: "lg",
    path: "/lg",
    component: () => import('./pages/lg/lg.vue')
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
