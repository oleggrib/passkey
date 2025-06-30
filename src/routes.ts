import { lazy } from 'solid-js'
import type { RouteDefinition } from '@solidjs/router'

import { Home } from './pages/home'
import { Root } from './pages/root'
import MerchantLogin from './pages/merchant/index'
import MerchantCreate from './pages/merchant/create'
import MerchantRedemption from './pages/merchant/redemption'

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Root,
  },
  {
    path: '/home',
    component: Home,
  },
  {
    path: '**',
    component: lazy(async () => import('./errors/404')),
  },
  {
    path: '/merchant',
    component: MerchantLogin,
  },
  {
    path: '/merchant/create',
    component: MerchantCreate,
  },
  {
    path: '/merchant/redemption',
    component: MerchantRedemption,
  },
]
