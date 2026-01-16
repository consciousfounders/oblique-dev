import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/hooks/useAuth'
import type { WebForm } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Copy, Check, Code, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function FormEmbedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<WebForm | null>(null)
  const [tenant, setTenant] = useState<{ slug: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Embed settings
  const [embedWidth, setEmbedWidth] = useState('100%')
  const [embedHeight, setEmbedHeight] = useState('600')

  useEffect(() => {
    if (id && user?.tenantId) {
      fetchData()
    }
  }, [id, user?.tenantId])

  async function fetchData() {
    try {
      const [formResult, tenantResult] = await Promise.all([
        supabase.from('web_forms').select('*').eq('id', id).single(),
        supabase.from('tenants').select('slug').eq('id', user?.tenantId).single(),
      ])

      if (formResult.error) throw formResult.error
      if (tenantResult.error) throw tenantResult.error

      setForm(formResult.data)
      setTenant(tenantResult.data)
    } catch (error) {
      console.error('Error fetching data:', error)
      navigate('/forms')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!form || !tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Form not found</p>
      </div>
    )
  }

  const baseUrl = window.location.origin
  const formUrl = `${baseUrl}/f/${tenant.slug}/${form.slug}`

  const iframeCode = `<iframe
  src="${formUrl}"
  width="${embedWidth}"
  height="${embedHeight}px"
  frameborder="0"
  style="border: none; max-width: 100%;"
  title="${form.name}"
></iframe>`

  const scriptCode = `<div id="oblique-form-${form.id}"></div>
<script>
(function() {
  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}';
  iframe.width = '${embedWidth}';
  iframe.height = '${embedHeight}px';
  iframe.frameBorder = '0';
  iframe.style.border = 'none';
  iframe.style.maxWidth = '100%';
  iframe.title = '${form.name}';
  document.getElementById('oblique-form-${form.id}').appendChild(iframe);
})();
</script>`

  const popupCode = `<script>
(function() {
  // Configuration
  var config = {
    formUrl: '${formUrl}',
    trigger: '${form.popup_trigger || 'time'}',
    delay: ${form.popup_delay_seconds || 5},
    scrollPercent: ${form.popup_scroll_percentage || 50}
  };

  var shown = false;

  function showPopup() {
    if (shown) return;
    shown = true;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var container = document.createElement('div');
    container.style.cssText = 'position:relative;max-width:600px;width:90%;max-height:90vh;background:white;border-radius:8px;overflow:hidden;';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;z-index:1;';
    closeBtn.onclick = function() { overlay.remove(); };

    var iframe = document.createElement('iframe');
    iframe.src = config.formUrl;
    iframe.style.cssText = 'width:100%;height:600px;border:none;';

    container.appendChild(closeBtn);
    container.appendChild(iframe);
    overlay.appendChild(container);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // Trigger logic
  if (config.trigger === 'time') {
    setTimeout(showPopup, config.delay * 1000);
  } else if (config.trigger === 'scroll') {
    window.addEventListener('scroll', function() {
      var scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= config.scrollPercent) showPopup();
    });
  } else if (config.trigger === 'exit_intent') {
    document.addEventListener('mouseout', function(e) {
      if (e.clientY < 0) showPopup();
    });
  }
})();
</script>`

  const buttonCode = `<button onclick="window.obliqueShowForm${form.id.replace(/-/g, '')}()">
  ${form.submit_button_text || 'Open Form'}
</button>
<script>
window.obliqueShowForm${form.id.replace(/-/g, '')} = function() {
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';

  var container = document.createElement('div');
  container.style.cssText = 'position:relative;max-width:600px;width:90%;max-height:90vh;background:white;border-radius:8px;overflow:hidden;';

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;background:none;border:none;font-size:24px;cursor:pointer;z-index:1;';
  closeBtn.onclick = function() { overlay.remove(); };

  var iframe = document.createElement('iframe');
  iframe.src = '${formUrl}';
  iframe.style.cssText = 'width:100%;height:600px;border:none;';

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  overlay.appendChild(container);
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
};
</script>`

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/forms/${id}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Editor
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Embed Form: {form.name}</h1>
          <p className="text-muted-foreground">Get the code to embed your form on your website</p>
        </div>
      </div>

      {/* Form Status Warning */}
      {form.status !== 'active' && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-4">
            <p className="text-yellow-800 dark:text-yellow-200">
              This form is currently {form.status}. Please activate it before embedding.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/forms/${id}`)}
            >
              Go to Form Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Direct Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Direct Link
          </CardTitle>
          <CardDescription>
            Share this link directly or use it as a landing page
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input value={formUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              onClick={() => copyToClipboard(formUrl, 'link')}
            >
              {copiedField === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={() => window.open(formUrl, '_blank')}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Embed Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Embed Settings</CardTitle>
          <CardDescription>Configure the size of the embedded form</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Width</label>
              <Input
                value={embedWidth}
                onChange={(e) => setEmbedWidth(e.target.value)}
                placeholder="100% or 500px"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Height (px)</label>
              <Input
                type="number"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                placeholder="600"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Iframe Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Iframe Embed
          </CardTitle>
          <CardDescription>
            Simple embed - just paste this HTML where you want the form to appear
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono">
              {iframeCode}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(iframeCode, 'iframe')}
            >
              {copiedField === 'iframe' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* JavaScript Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            JavaScript Embed
          </CardTitle>
          <CardDescription>
            Dynamic loading - better for SPA websites or when you need more control
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {scriptCode}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(scriptCode, 'script')}
            >
              {copiedField === 'script' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Popup Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Popup / Modal
          </CardTitle>
          <CardDescription>
            Show the form as a popup based on triggers (time, scroll, exit intent)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {popupCode}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(popupCode, 'popup')}
            >
              {copiedField === 'popup' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Button Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="w-5 h-5" />
            Button Click Popup
          </CardTitle>
          <CardDescription>
            Show the form when a button is clicked
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
              {buttonCode}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(buttonCode, 'button')}
            >
              {copiedField === 'button' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
