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
  User,
  RefreshCw,
  FileText,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useNotifications } from '@/app/context/NotificationContext'
import ExportButton from '@/app/components/ExportButton'

interface Policy {
  id: string
  client_id: string
  policy_number: string
  carrier_name: string
  policy_type: string
  monthly_premium: number
  annual_premium: number
  commission_amount: number
  renewal_date: string
  effective_date: string
  reminder_days: number
  reminder_stage: number
  notes: string
  created_at: string
  clients?: {
    first_name: string
    last_name: string
    email: string
  }
}

export default function PoliciesPage() {
  const { addNotification } = useNotifications()
  const [policies, setPolicies] = useState<Policy[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStage, setFilterStage] = useState('all')
  const [filterType, setFilterType] = useState('all')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    client_id: '',
    policy_number: '',
    carrier_name: '',
    policy_type: 'life',
    monthly_premium: '',
    annual_premium: '',
    commission_amount: '',
    renewal_date: '',
    effective_date: '',
    reminder_days: '30',
    notes: ''
  })

  // Fetch clients for dropdown
  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, first_name, last_name, email, phone')
    if (data) setClients(data)
  }

  const fetchPolicies = async () => {
    try {
      setLoading(true)
      
      const { data: allPolicies, error: fetchError } = await supabase
        .from('policies')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) {
        console.error('❌ Error fetching policies:', fetchError)
        setPolicies([])
        setLoading(false)
        return
      }

      if (!allPolicies || allPolicies.length === 0) {
        setPolicies([])
        setLoading(false)
        return
      }

      const policiesWithClients = await Promise.all(
        allPolicies.map(async (policy) => {
          if (policy.client_id) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('first_name, last_name, email')
              .eq('id', policy.client_id)
              .single()
            
            return {
              ...policy,
              clients: clientData || null
            }
          }
          return policy
        })
      )
      
      setPolicies(policiesWithClients)
      
    } catch (error) {
      console.error('❌ Unexpected error:', error)
      setPolicies([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
    fetchClients()
  }, [])

  // Real-time subscription for policies
  useEffect(() => {
    const subscription = supabase
      .channel('policies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'policies'
        },
        () => {
          fetchPolicies()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Check for duplicate policy number
  const checkDuplicatePolicy = async (policyNumber: string, excludeId?: string) => {
    let query = supabase
      .from('policies')
      .select('id, policy_number')
      .eq('policy_number', policyNumber)
    
    if (excludeId) {
      query = query.neq('id', excludeId)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data && data.length > 0
  }

  const handleAdd = () => {
    setSelectedPolicy(null)
    setDuplicateError('')
    setFormData({
      client_id: '',
      policy_number: `POL-${Date.now().toString().slice(-6)}`,
      carrier_name: '',
      policy_type: 'life',
      monthly_premium: '',
      annual_premium: '',
      commission_amount: '',
      renewal_date: '',
      effective_date: '',
      reminder_days: '30',
      notes: ''
    })
    setShowModal(true)
  }

  const handleEdit = (policy: any) => {
    setSelectedPolicy(policy)
    setDuplicateError('')
    setFormData({
      client_id: policy.client_id || '',
      policy_number: policy.policy_number || '',
      carrier_name: policy.carrier_name || '',
      policy_type: policy.policy_type || 'life',
      monthly_premium: policy.monthly_premium?.toString() || '',
      annual_premium: policy.annual_premium?.toString() || '',
      commission_amount: policy.commission_amount?.toString() || '',
      renewal_date: policy.renewal_date?.split('T')[0] || '',
      effective_date: policy.effective_date?.split('T')[0] || '',
      reminder_days: policy.reminder_days?.toString() || '30',
      notes: policy.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = (policy: any) => {
    setSelectedPolicy(policy)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedPolicy) return
    
    setDeleting(true)
    try {
      const { error } = await supabase
        .from('policies')
        .delete()
        .eq('id', selectedPolicy.id)

      if (error) throw error
      
      addNotification('success', `Policy #${selectedPolicy.policy_number?.slice(0, 8)} deleted successfully`)
      setShowDeleteModal(false)
      setSelectedPolicy(null)
      await fetchPolicies()
    } catch (error) {
      console.error('Error deleting policy:', error)
      addNotification('error', 'Failed to delete policy. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const generatePolicyNumber = () => {
    const newNumber = `POL-${Date.now().toString().slice(-6)}`
    setFormData({ ...formData, policy_number: newNumber })
    setDuplicateError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setDuplicateError('')

    try {
      // Check for duplicate policy number
      const isDuplicate = await checkDuplicatePolicy(
        formData.policy_number,
        selectedPolicy?.id
      )

      if (isDuplicate) {
        setDuplicateError(`Policy number "${formData.policy_number}" already exists. Please use a unique policy number.`)
        setSaving(false)
        return
      }

      // Prepare data matching your table columns
      const data = {
        client_id: formData.client_id || null,
        policy_number: formData.policy_number,
        carrier_name: formData.carrier_name,
        policy_type: formData.policy_type,
        monthly_premium: parseFloat(formData.monthly_premium) || 0,
        annual_premium: parseFloat(formData.annual_premium) || 0,
        commission_amount: parseFloat(formData.commission_amount) || 0,
        effective_date: formData.effective_date || null,
        renewal_date: formData.renewal_date || null,
        reminder_days: parseInt(formData.reminder_days) || 30,
        reminder_stage: 0,
        notes: formData.notes || ''
      }

      console.log('📤 Sending data to Supabase:', data)

      if (selectedPolicy) {
        const { error } = await supabase
          .from('policies')
          .update(data)
          .eq('id', selectedPolicy.id)

        if (error) throw error
        addNotification('success', `Policy #${formData.policy_number.slice(0, 8)} updated successfully`)
      } else {
        const { error } = await supabase
          .from('policies')
          .insert([data])

        if (error) throw error
        addNotification('success', `Policy #${formData.policy_number.slice(0, 8)} created successfully`)
      }

      setShowModal(false)
      setFormData({
        client_id: '',
        policy_number: '',
        carrier_name: '',
        policy_type: 'life',
        monthly_premium: '',
        annual_premium: '',
        commission_amount: '',
        renewal_date: '',
        effective_date: '',
        reminder_days: '30',
        notes: ''
      })
      await fetchPolicies()
    } catch (error: any) {
      console.error('❌ Error saving policy:', error)
      addNotification('error', `Failed to save policy: ${error.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  // Filter policies
  const filteredPolicies = policies.filter(policy => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const clientName = policy.clients 
        ? `${policy.clients.first_name} ${policy.clients.last_name}`.toLowerCase()
        : ''
      const matchesSearch = 
        policy.policy_number?.toLowerCase().includes(search) ||
        policy.policy_type?.toLowerCase().includes(search) ||
        policy.carrier_name?.toLowerCase().includes(search) ||
        clientName.includes(search)
      if (!matchesSearch) return false
    }

    // Stage filter (reminder_stage)
    if (filterStage !== 'all' && policy.reminder_stage?.toString() !== filterStage) return false

    // Type filter
    if (filterType !== 'all' && policy.policy_type !== filterType) return false

    return true
  })

  const getStageColor = (stage: number) => {
    const colors: Record<number, string> = {
      0: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      1: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      2: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      3: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }
    return colors[stage] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const getStageLabel = (stage: number) => {
    const labels: Record<number, string> = {
      0: 'Active',
      1: 'Reminder Sent',
      2: 'Follow-up',
      3: 'Expired'
    }
    return labels[stage] || 'Unknown'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      life: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      health: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      auto: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      home: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      business: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      travel: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      disability: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    }
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Stats
  const totalPolicies = policies.length
  const activePolicies = policies.filter(p => p.reminder_stage === 0).length
  const totalCommission = policies.reduce((sum, p) => sum + (p.commission_amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading policies...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Policies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage all insurance policies
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <ExportButton
            data={filteredPolicies}
            filename="policies"
            headers={[
              { key: 'policy_number', label: 'Policy Number' },
              { key: 'carrier_name', label: 'Carrier' },
              { key: 'policy_type', label: 'Type' },
              { key: 'monthly_premium', label: 'Monthly Premium' },
              { key: 'commission_amount', label: 'Commission' },
              { key: 'renewal_date', label: 'Renewal Date' },
            ]}
          />
          <button
            onClick={fetchPolicies}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Policies</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPolicies}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active Policies</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activePolicies}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Commission</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ${totalCommission.toLocaleString()}
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
              placeholder="Search policies by client, carrier, or policy number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 placeholder-gray-500 dark:placeholder-gray-400 text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All Stages</option>
              <option value="0">Active</option>
              <option value="1">Reminder Sent</option>
              <option value="2">Follow-up</option>
              <option value="3">Expired</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
            >
              <option value="all">All Types</option>
              <option value="life">Life</option>
              <option value="health">Health</option>
              <option value="auto">Auto</option>
              <option value="home">Home</option>
              <option value="business">Business</option>
              <option value="travel">Travel</option>
              <option value="disability">Disability</option>
            </select>
          </div>
        </div>
      </div>

      {/* Policies Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Policy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Monthly Premium
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Renewal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPolicies.length > 0 ? (
                filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {policy.policy_number || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {policy.policy_type || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {policy.clients?.first_name} {policy.clients?.last_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {policy.clients?.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {policy.carrier_name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        ${policy.monthly_premium?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400">
                        ${policy.commission_amount?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(policy.renewal_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(policy.reminder_stage)}`}>
                        {getStageLabel(policy.reminder_stage)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => handleEdit(policy)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(policy)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p>No policies found</p>
                    <p className="text-sm">Create your first policy to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredPolicies.length} of {policies.length} policies
      </div>

      {/* ===== MODALS ===== */}

      {/* Add/Edit Policy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedPolicy ? 'Edit Policy' : 'Add New Policy'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Duplicate Error */}
                {duplicateError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 dark:text-red-400">{duplicateError}</p>
                  </div>
                )}

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.first_name} {client.last_name} - {client.phone || client.email}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Policy Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Policy Number *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.policy_number}
                      onChange={(e) => {
                        setFormData({ ...formData, policy_number: e.target.value })
                        setDuplicateError('')
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                      required
                      placeholder="e.g., POL-2024-001"
                    />
                    <button
                      type="button"
                      onClick={generatePolicyNumber}
                      className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                {/* Carrier Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Carrier Name *
                  </label>
                  <input
                    type="text"
                    value={formData.carrier_name}
                    onChange={(e) => setFormData({ ...formData, carrier_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    required
                    placeholder="e.g., ABC Insurance"
                  />
                </div>

                {/* Policy Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Policy Type *
                  </label>
                  <select
                    value={formData.policy_type}
                    onChange={(e) => setFormData({ ...formData, policy_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    required
                  >
                    <option value="life">Life</option>
                    <option value="health">Health</option>
                    <option value="auto">Auto</option>
                    <option value="home">Home</option>
                    <option value="business">Business</option>
                    <option value="travel">Travel</option>
                    <option value="disability">Disability</option>
                  </select>
                </div>

                {/* Monthly and Annual Premium */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Monthly Premium ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.monthly_premium}
                      onChange={(e) => {
                        const monthly = parseFloat(e.target.value) || 0
                        setFormData({ 
                          ...formData, 
                          monthly_premium: e.target.value,
                          annual_premium: (monthly * 12).toString(),
                          commission_amount: (monthly * 12 * 0.10).toString()
                        })
                      }}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                      required
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Annual Premium ($)
                    </label>
                    <input
                      type="number"
                      value={formData.annual_premium}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-gray-100 dark:bg-gray-800"
                      min="0"
                      step="0.01"
                      placeholder="Auto-calculated"
                      disabled
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Auto-calculated from monthly × 12
                    </p>
                  </div>
                </div>

                {/* Commission Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Commission Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.commission_amount}
                    onChange={(e) => setFormData({ ...formData, commission_amount: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    min="0"
                    step="0.01"
                    placeholder="Auto-calculated (10%)"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Auto-calculated at 10% of annual premium
                  </p>
                </div>

                {/* Effective and Renewal Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Effective Date *
                    </label>
                    <input
                      type="date"
                      value={formData.effective_date}
                      onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    />
                  </div>
                </div>

                {/* Reminder Days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Reminder Days Before Renewal
                  </label>
                  <select
                    value={formData.reminder_days}
                    onChange={(e) => setFormData({ ...formData, reminder_days: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                  >
                    <option value="15">15 days</option>
                    <option value="30">30 days</option>
                    <option value="45">45 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 text-sm bg-white dark:bg-gray-900"
                    rows={3}
                    placeholder="Additional notes about this policy..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 justify-end border-t border-gray-200 dark:border-gray-700 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      selectedPolicy ? 'Update Policy' : 'Create Policy'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Policy</h2>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                  Are you sure you want to delete policy #{selectedPolicy?.policy_number || selectedPolicy?.id?.slice(0, 8)}? 
                  This action cannot be undone.
                </p>
                
                <div className="flex items-center gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}