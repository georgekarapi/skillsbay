import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { DashboardPage } from "@/pages/dashboard-page"
import { MarketplacePage } from "@/pages/marketplace-page"
import { NotFoundPage } from "@/pages/not-found-page"
import { SkillDetailPage } from "@/pages/skill-detail-page"
import { PublishSkillPage } from "@/pages/publish-skill-page"
import { DocsPage } from "@/pages/docs-page"
import { ManageSkillPage } from "@/pages/manage-skill-page"

function LegacySkillRedirect() {
  const { namespace, slug } = useParams()
  return <Navigate replace to={`/${namespace}/${slug}`} />
}

function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketplacePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/skills/:namespace/:slug" element={<LegacySkillRedirect />} />
          <Route path="/for-authors" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/publish" element={<Navigate replace to="/dashboard/skills/new" />} />
          <Route path="/dashboard/skills/new" element={<PublishSkillPage />} />
          <Route path="/dashboard/skills/:namespace/:slug" element={<ManageSkillPage />} />
          <Route path="/:username/:skillSlug" element={<SkillDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  )
}

export default App
