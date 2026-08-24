/*
*******************************************************************
config.ts

Copyright (C) 2024 iEdon
Copyright (C) 2026 Luochancy

This file is part of a project derived from iedon-net-frontend.
Modified by Luochancy on 2026-06.

Licensed under the GNU General Public License v3.0.
See the LICENSE file in the project root for details.
*******************************************************************
*/
/**
 * 
 *    LuocyNet PeerHub Frontend     
 *          Configutation            
 * 
 */

import pkg from '../package.json'
import { networkInfo } from './branding'

export default {
  root: '/',
  version: pkg.version,
  package: `${pkg.name}/${pkg.version}`,
  apiPrefix: 'https://api-dn42.luocynet.com',
  pingIntervalMs: 180000,
  configFallback: {
    netAsn: networkInfo.asn,
    netName: networkInfo.netName,
    netDesc: networkInfo.netDesc,
    footerText: '',
    maintenanceText: ''
  },
  gravatarUrlPrefix: 'https://www.gravatar.com/avatar/',
  openAuthOptions: {
    enableKioubit: true,
    enableOidc: true,
  },
  openAuthCallback: {
    // Compatibility:
    // will handle token to our type -> kioubit: 'https://dn42.luocynet.com/openAuth?type=kioubit',
    kioubit: 'https://dn42.luocynet.com/openAuth?token=kioubit.dn42',
    oidc: 'https://dn42.luocynet.com/openAuth?type=oidc',
  },
  oidc: {
    clientId: '',
    authorizationEndpoint: 'https://auth.iedon.net/authorize',
    scope: 'openid profile email dn42',
  },
  metricPageRefreshInterval: 300000, // 5 minutes
  grafana: {
    urlPrefix: '',
    queryStringForLocating: {
      router: 'router',
      session: 'session',
    },
  },
  lgUrl: {} as Record<string, string>,
}
