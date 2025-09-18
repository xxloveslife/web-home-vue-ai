import { createRouter, createWebHashHistory } from 'vue-router'

const HomePage = () => import('@/views/Home/HomePage.vue')
const AppsPage = () => import('@/views/Apps/AppsPage.vue')
const TranslatePage = () => import('@/views/Translate/TranslatePage.vue')
const FilesPage = () => import('@/views/Files/FilesPage.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/apps', name: 'apps', component: AppsPage },
    { path: '/translate', name: 'translate', component: TranslatePage },
    { path: '/files', name: 'files', component: FilesPage }
  ]
})

export default router


