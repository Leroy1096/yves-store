import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import CartDrawer from './components/CartDrawer'
import Footer from './components/Footer'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Floating from './components/Floating'
import QuickAdd from './components/QuickAdd'
import Toast from './components/Toast'
import Home from './pages/Home'
import { useAuth } from './store/auth'
import { useCatalogVersion } from './lib/catalog'

const Shop = lazy(() => import('./pages/Shop'))
const Categories = lazy(() => import('./pages/Categories'))
const ProductPage = lazy(() => import('./pages/Product'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Success = lazy(() => import('./pages/Success'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Account = lazy(() => import('./pages/Account'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AdminApp = lazy(() => import('./pages/admin/AdminApp'))
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'))

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  const init = useAuth((s) => s.init)
  useCatalogVersion((s) => s.v) // re-rendu quand le gérant change prix / stock / articles
  useEffect(() => { init() }, [init])
  const minimal = pathname.startsWith('/commande') || pathname === '/compte' || pathname === '/reinitialiser' || pathname.startsWith('/gerant')
  const isProduct = pathname.startsWith('/produit/')
  return (
    <>
      <ScrollTop />
      {!minimal && <Header />}
      <Suspense fallback={<div className="min-h-[70vh]" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/boutique" element={<Shop />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/produit/:slug" element={<ProductPage />} />
          <Route path="/commande" element={<Checkout />} />
          <Route path="/commande/confirmation/:id" element={<Success />} />
          <Route path="/favoris" element={<Wishlist />} />
          <Route path="/compte" element={<Account />} />
          <Route path="/mon-compte" element={<Dashboard />} />
          <Route path="/reinitialiser" element={<ResetPassword />} />
          <Route path="/desabonnement" element={<Unsubscribe />} />
          <Route path="/gerant/*" element={<AdminApp />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      {!minimal && pathname !== '/categories' && <Footer />}
      <CartDrawer />
      <QuickAdd />
      <Toast />
      {!minimal && !isProduct && <BottomNav />}
      {!minimal && <Floating raised={isProduct} bottomNav={!isProduct} />}
    </>
  )
}
