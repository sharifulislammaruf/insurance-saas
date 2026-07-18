'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Search, 
  Eye,
  Edit,
  Trash2,
  Plus,
  Calendar,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  Check,
  MessageSquare
} from 'lucide-react'
import { useNotifications } from '@/app/context/NotificationContext'
import ExportButton from '@/app/components/ExportButton'

interface Claim {
  id: string
  policy_id: string
  claim_number: string
  claim_type: string
  claim_amount: number
  status: string
  incident_date: string
  notes: string
  follow_up_date: string
  resolved_at: string
  created_at: string
  policy_number?: string
  client_name?: string
}

export default function ClaimsPage() {
  const { addNotification } = useNotifications()
  const [claims, setClaims] = useState<Claim[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [showStatusDropdown, setShowStatusDropdown] = useState<string | null>(null)

  const fetchClaims = async () => {
    try {
      setLoading(true)
      
      const { data: claimsData, error: claimsError } = await supabase
        .from('claims')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (claimsError) {
        console.error('❌ Error fetching claims:', claimsError)
        setClaims([])
        setLoading(false)
        return
      }

      if (!claimsData || claimsData.length === 0) {
        setClaims([])
        setLoading(false)
        return
      }
      
      const policyIds = [...new Set(claimsData.map(c => c.policy_id).filter(Boolean))]
      
      let policiesMap: Record<string, any> = {}
      if (policyIds.length > 0) {
        const { data: policiesData } = await supabase
          .from('policies')
          .select('id, policy_number, client_id')
          .in('id', policyIds)
        
        if (policiesData) {
          policiesMap = policiesData.reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {} as Record<string, any>)
        }
      }
      
      const clientIds = [...new Set(
        Object.values(policiesMap)
          .map((p: any) => p.client_id)
          .filter(Boolean)
      )]
      
      let clientsMap: Record<string, any> = {}
      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .in('id', clientIds)
        
        if (clientsData) {
          clientsMap = clientsData.reduce((acc, c) => {
            acc[c.id] = c
            return acc
          }, {} as Record<string, any>)
        }
      }
      
      const enrichedClaims = claimsData.map((claim: any) => {
        const policy = policiesMap[claim.policy_id] || {}
        const client = clientsMap[policy.client_id] || {}
        return {
          ...claim,
          policy_number: policy.policy_number || 'N/A',
          client_name: client.first_name && client.last_name 
            ? `${client.first_name} ${client.last_name}`
            : 'No Client'
        }
      })
      
      setClaims(enrichedClaims)
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      setClaims([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClaims()
  }, [])

  useEffect(() => {
  const subscription = supabase
    .channel('claims-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, () => fetchClaims())
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [])

  const updateClaimStatus = async (claimId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('claims')
        .update(updateData)
        .eq('id', claimId)

      if (error) throw error

      addNotification('success', `Claim status updated to ${newStatus}`)
      await fetchClaims()
      setShowStatusDropdown(null)
    } catch (error) {
      console.error('Error updating claim status:', error)
      addNotification('error', 'Failed to update claim status')
    }
  }

  const filteredClaims = claims.filter(claim => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesSearch = 
        claim.claim_number?.toLowerCase().includes(search) ||
        claim.claim_type?.toLowerCase().includes(search) ||
        claim.client_name?.toLowerCase().includes(search) ||
        claim.policy_number?.toLowerCase().includes(search) ||
        claim.status?.toLowerCase().includes(search)
      if (!matchesSearch) return false
    }
    if (filterStatus !== 'all' && claim.status !== filterStatus) return false
    if (filterType !== 'all' && claim.claim_type?.toLowerCase() !== filterType.toLowerCase()) return false
    return true
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      investigating: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    }
    return colors[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      submitted: <Clock className="h-3 w-3" />,
      under_review: <AlertCircle className="h-3 w-3" />,
      investigating: <Search className="h-3 w-3" />,
      approved: <Check className="h-3 w-3" />,
      resolved: <CheckCircle className="h-3 w-3" />,
      rejected: <XCircle className="h-3 w-3" />,
      pending: <Clock className="h-3 w-3" />
    }
    return icons[status] || null
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      fire: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      theft: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      accident: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      health: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      life: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      property: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      home: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      auto: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
    }
    return colors[type?.toLowerCase()] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const totalClaims = claims.length
  const pendingClaims = claims.filter(c => c.status === 'pending' || c.status === 'submitted').length
  const resolvedClaims = claims.filter(c => c.status === 'resolved' || c.status === 'approved').length
  const totalAmount = claims.reduce((sum, c) => sum + (c.claim_amount || 0), 0)

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'approved', label: 'Approved' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'pending', label: 'Pending' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all insurance claims
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton
            data={filteredClaims}
            filename="claims"
            headers={[
              { key: 'claim_number', label: 'Claim ID' },
              { key: 'client_name', label: 'Client' },
              { key: 'claim_type', label: 'Type' },
              { key: 'claim_amount', label: 'Amount' },
              { key: 'status', label: 'Status' },
              { key: 'incident_date', label: 'Incident Date' },
            ]}
          />
          <button
            onClick={fetchClaims}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Claim
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Claims</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalClaims}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingClaims}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedClaims}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search claims by claim number, type, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All Status</option>
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All Types</option>
              <option value="home">Home</option>
              <option value="auto">Auto</option>
              <option value="fire">Fire</option>
              <option value="theft">Theft</option>
              <option value="accident">Accident</option>
              <option value="health">Health</option>
              <option value="life">Life</option>
              <option value="property">Property</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Claim ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Policy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Incident Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        #{claim.claim_number?.slice(0, 8) || claim.id.slice(0, 8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {claim.policy_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {claim.client_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(claim.claim_type)}`}>
                        {claim.claim_type || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ${claim.claim_amount?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <button
                        onClick={() => setShowStatusDropdown(showStatusDropdown === claim.id ? null : claim.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${getStatusColor(claim.status)} hover:opacity-80 transition-opacity`}
                      >
                        {getStatusIcon(claim.status)}
                        {claim.status?.replace('_', ' ') || 'N/A'}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showStatusDropdown === claim.id && (
                        <div className="absolute z-10 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                          {statusOptions.map((s) => (
                            <button
                              key={s.value}
                              onClick={() => updateClaimStatus(claim.id, s.value)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                            >
                              <span className={`w-2 h-2 rounded-full ${getStatusColor(s.value).replace('text-', 'bg-')}`} />
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(claim.incident_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mr-3">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p>No claims found</p>
                    <p className="text-sm">Create your first claim to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredClaims.length} of {claims.length} claims
      </div>
    </div>
  )
}