import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { useTheme } from '@/lib/hooks/useTheme'
import { useLinkedInSettings } from '@/lib/hooks/useLinkedIn'
import { supabase } from '@/lib/supabase'
import { GoogleTokenService } from '@/lib/services/googleTokenService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sun, Moon, Monitor, Eye, EyeOff, Mail, Calendar, HardDrive, Check, X, RefreshCw, Linkedin, Settings, Bell, ChevronRight, Zap, Sliders, UserCog } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/usePermissions'

export function SettingsPage() {
  const { user, session, signOut, signInWithGoogle } = useAuth()
  const { theme, setTheme } = useTheme()
  const { hasPermission, isAdmin } = usePermissions()
  const [mounted, setMounted] = useState(false)

  const [fullName, setFullName] = useState(user?.fullName || '')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Google connection state
  const [googleConnected, setGoogleConnected] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // LinkedIn integration
  const { settings: linkedInSettings } = useLinkedInSettings()

  // Check Google connection status
  useEffect(() => {
    setGoogleConnected(!!session?.provider_token)
  }, [session])

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName)
    }
  }, [user?.fullName])

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', user?.id)

      if (error) {
        setMessage({ type: 'error', text: 'Failed to update profile' })
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setChangingPassword(true)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      setChangingPassword(false)
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      setChangingPassword(false)
      return
    }

    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        setMessage({ type: 'error', text: 'Current password is incorrect' })
        setChangingPassword(false)
        return
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Password updated successfully' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setChangingPassword(false)
    }
  }

  async function handleDisconnectGoogle() {
    setDisconnecting(true)
    try {
      // Clear local tokens
      GoogleTokenService.clearTokens()
      // Sign out and back in to clear provider tokens from session
      // Note: Full disconnect would require revoking at Google, but this clears local state
      await supabase.auth.refreshSession()
      setGoogleConnected(false)
      setMessage({ type: 'success', text: 'Google account disconnected. Re-connect to restore access.' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to disconnect Google account' })
    } finally {
      setDisconnecting(false)
    }
  }

  async function handleConnectGoogle() {
    try {
      await signInWithGoogle()
    } catch {
      setMessage({ type: 'error', text: 'Failed to connect Google account' })
    }
  }

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-md border text-sm ${
            message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-destructive/50 bg-destructive/10 text-destructive'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/settings/notifications">
            <Button variant="outline" className="w-full justify-between">
              <span>Notification preferences</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Data Enrichment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            Data Enrichment
          </CardTitle>
          <CardDescription>Configure enrichment providers and automation</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/settings/enrichment">
            <Button variant="outline" className="w-full justify-between">
              <span>Enrichment settings</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* User Management - Admin only */}
      {(hasPermission('users.view') || isAdmin) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-indigo-500" />
              User Management
            </CardTitle>
            <CardDescription>Manage user roles and team assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings/users">
              <Button variant="outline" className="w-full justify-between">
                <span>Manage users</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            Custom Fields
          </CardTitle>
          <CardDescription>Add custom fields to accounts, contacts, leads, and deals</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/settings/custom-fields">
            <Button variant="outline" className="w-full justify-between">
              <span>Manage custom fields</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Oblique looks to you</CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="flex flex-wrap gap-2">
              {themeOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${
                      theme === option.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {option.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="h-10 w-24 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 w-24 rounded-lg bg-muted animate-pulse" />
              <div className="h-10 w-24 rounded-lg bg-muted animate-pulse" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>Manage your connected services and integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">
                  {googleConnected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleConnected ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    <span className="text-xs">Active</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConnectGoogle}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reconnect
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectGoogle}
                    disabled={disconnecting}
                  >
                    <X className="w-3 h-3 mr-1" />
                    {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                </>
              ) : (
                <Button onClick={handleConnectGoogle}>
                  Connect Google
                </Button>
              )}
            </div>
          </div>

          {/* Services enabled by Google */}
          {googleConnected && (
            <div className="pl-4 border-l-2 border-muted space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Enabled services:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  <Mail className="w-3.5 h-3.5" />
                  Gmail
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  <Calendar className="w-3.5 h-3.5" />
                  Calendar
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  <HardDrive className="w-3.5 h-3.5" />
                  Drive
                </div>
              </div>
            </div>
          )}

          {/* LinkedIn Sales Navigator */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0A66C2]">
                <Linkedin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium">LinkedIn Sales Navigator</p>
                <p className="text-sm text-muted-foreground">
                  {linkedInSettings ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {linkedInSettings ? (
                <>
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-600 dark:text-green-400">
                    <Check className="w-3 h-3" />
                    <span className="text-xs">Active</span>
                  </div>
                  <Link to="/linkedin">
                    <Button variant="outline" size="sm">
                      <Settings className="w-3 h-3 mr-1" />
                      Configure
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/linkedin">
                  <Button>
                    Set Up LinkedIn
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* LinkedIn enabled features */}
          {linkedInSettings && (
            <div className="pl-4 border-l-2 border-muted space-y-2">
              <p className="text-sm text-muted-foreground mb-3">Enabled features:</p>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  Profile Lookup
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  InMail
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  Activity Tracking
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
                  Saved Leads
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={user?.email || ''} disabled />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input
                value={user?.role ? user.role.toUpperCase() : user?.isSuperAdmin ? 'Super Admin' : 'No role'}
                disabled
              />
            </div>

            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password to keep your account secure</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={changingPassword || !currentPassword || !newPassword}>
              {changingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
