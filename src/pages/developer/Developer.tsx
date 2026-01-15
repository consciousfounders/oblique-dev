import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs'
import { Key, Webhook, Code, FileText, AppWindow } from 'lucide-react'
import { ApiKeysSection } from './ApiKeys'
import { WebhooksSection } from './Webhooks'
import { OAuthAppsSection } from './OAuthApps'
import { ApiExplorer } from './ApiExplorer'
import { ApiDocs } from './ApiDocs'

type TabValue = 'api-keys' | 'webhooks' | 'oauth-apps' | 'explorer' | 'docs'

export function DeveloperPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('api-keys')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developer</h1>
        <p className="text-muted-foreground">
          Manage API access, webhooks, and explore the API
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
          <TabsTrigger
            value="api-keys"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Key className="w-4 h-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger
            value="webhooks"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger
            value="oauth-apps"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <AppWindow className="w-4 h-4" />
            OAuth Apps
          </TabsTrigger>
          <TabsTrigger
            value="explorer"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Code className="w-4 h-4" />
            API Explorer
          </TabsTrigger>
          <TabsTrigger
            value="docs"
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="api-keys" className="focus:outline-none">
            <ApiKeysSection />
          </TabsContent>
          <TabsContent value="webhooks" className="focus:outline-none">
            <WebhooksSection />
          </TabsContent>
          <TabsContent value="oauth-apps" className="focus:outline-none">
            <OAuthAppsSection />
          </TabsContent>
          <TabsContent value="explorer" className="focus:outline-none">
            <ApiExplorer />
          </TabsContent>
          <TabsContent value="docs" className="focus:outline-none">
            <ApiDocs />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
