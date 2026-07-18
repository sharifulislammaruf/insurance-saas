'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Activity,
  RefreshCw,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  country: string
  status: string
  created_at: string
}

interface Policy {
  id: string
  client_id: string
  commission_amount: number
  created_at: string
  clients?: {
    first_name: string
    last_name: string
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Stats
  const [totalClients, setTotalClients] = useState(0)
  const [totalPolicies, setTotalPolicies] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [activeClients, setActiveClients] = useState(0)
  
  // Recent data
  const [recentClients, setRecentClients] = useState<Client[]>([])
  const [recentPolicies, setRecentPolicies] = useState<Policy[]>([])
  
  // User info
  const [userEmail, setUserEmail] = useState('')

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      
      // Get session
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        router.push('/login')
        return
      }
      setUserEmail(sessionData.session.user.email || '')

      // Fetch all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (clientsError) throw clientsError

      // Fetch all policies (without nested relation)
      const { data: policies, error: policiesError } = await supabase
        .from('policies')
        .select('*')
        .order('created_at', { ascending: false })

      if (policiesError) throw policiesError

      // Get unique client IDs from policies
      const clientIds = [...new Set(policies?.map(p => p.client_id).filter(Boolean))]

      // Fetch client data for these IDs
      let clientsMap: Record<string, any> = {}
      if (clientIds.length > 0) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .in('id', clientIds)
        
        if (clientData) {
          clientsMap = clientData.reduce((acc, c) => {
            acc[c.id] = c
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Combine policy data with client names
      const policiesWithClients = policies?.map(policy => ({
        ...policy,
        clients: policy.client_id ? clientsMap[policy.client_id] : null
      })) || []

      // Calculate stats
      const active = clients?.filter(c => c.status === 'active').length || 0
      const commission = policies?.reduce(
        (sum, p) => sum + (p.commission_amount || 0), 
        0
      ) || 0

      setTotalClients(clients?.length || 0)
      setTotalPolicies(policies?.length || 0)
      setTotalCommission(commission)
      setActiveClients(active)
      
      // Recent data (last 5)
      setRecentClients(clients?.slice(0, 5) || [])
      setRecentPolicies(policiesWithClients?.slice(0, 5) || [])

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [router])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Insurance Dashboard</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Total Clients"
            value={totalClients}
            subtext={`${activeClients} active`}
            color="blue"
          />
          <StatCard
            icon={FileText}
            label="Total Policies"
            value={totalPolicies}
            subtext="Active policies"
            color="purple"
          />
          <StatCard
            icon={DollarSign}
            label="Total Commission"
            value={`$${totalCommission.toLocaleString()}`}
            subtext="Lifetime earnings"
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Conversion Rate"
            value={`${totalClients > 0 ? Math.round((totalPolicies / totalClients) * 100) : 0}%`}
            subtext="Policies per client"
            color="orange"
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Recent Clients</h2>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Last 5
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentClients.length > 0 ? (
                recentClients.map((client) => (
                  <div key={client.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {client.first_name} {client.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          client.status === 'active' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {client.status || 'N/A'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Users className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p>No clients yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Policies */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h2 className="font-semibold text-gray-900 dark:text-white">Recent Policies</h2>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                  Last 5
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentPolicies.length > 0 ? (
                recentPolicies.map((policy) => (
                  <div key={policy.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Policy #{policy.id.slice(0, 8)}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(policy.created_at)}
                          </span>
                          {policy.clients && (
                            <span>
                              {policy.clients.first_name} {policy.clients.last_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          ${policy.commission_amount?.toLocaleString() || '0'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Commission</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <FileText className="h-8 w-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p>No policies yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 dark:text-gray-400 gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Last updated: {new Date().toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span>⚡ {totalClients} total clients</span>
              <span>📄 {totalPolicies} total policies</span>
              <span>💰 ${totalCommission.toLocaleString()} total commission</span>
            </div>
          </div>
        </div>

        {/* Professional Contact Section */}
        <div className="mt-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/50 p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-600/20">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Need a Custom Solution?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    This is a demo project. I build custom insurance automation solutions.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <a
                  href="mailto:mdsislammaruf@gmail.com"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email Me
                </a>
                <a
                  href="https://www.linkedin.com/in/sharifulislammaruf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#0077B5] text-white rounded-lg hover:bg-[#006399] transition-colors text-sm font-medium flex items-center gap-2 shadow-lg shadow-[#0077B5]/20"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="https://github.com/sharifulislammaruf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium flex items-center gap-2 shadow-lg shadow-gray-800/20"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  GitHub
                </a>
              </div>
            </div>
            
            <div className="border-t border-blue-200/50 dark:border-blue-800/50 my-4"></div>
            
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 dark:text-gray-400 gap-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="text-green-500">●</span> 
                  Available for projects
                </span>
                <span className="hidden sm:inline">|</span>
                <span>⏱️ Quick response within 24 hours</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs">
                  © {new Date().getFullYear()} • Built with ❤️ using Next.js + Supabase
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Stat Card Component
// Stat Card Component
function StatCard({ icon: Icon, label, value, subtext, color }: { 
  icon: any
  label: string
  value: string | number
  subtext: string
  color: 'blue' | 'purple' | 'green' | 'orange'
}) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">📊</span>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{label}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
      </div>
    </div>
  )
}