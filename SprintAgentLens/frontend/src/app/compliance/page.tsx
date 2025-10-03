'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Eye, Download, Settings, Users, Lock, Key, Activity, BarChart3, TrendingUp, Search, Filter, Calendar, Bell, Flag } from 'lucide-react'

interface ComplianceRule {
  id: string
  name: string
  description: string
  framework: 'GDPR' | 'SOC2' | 'HIPAA' | 'PCI-DSS' | 'ISO27001'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'compliant' | 'non-compliant' | 'at-risk' | 'pending'
  lastChecked: Date
  nextAudit: Date
}

interface AuditLog {
  id: string
  timestamp: Date
  user: string
  action: string
  resource: string
  outcome: 'success' | 'failure' | 'warning'
  ipAddress: string
  details: string
}

interface RiskAssessment {
  id: string
  title: string
  category: 'data' | 'security' | 'operational' | 'financial'
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact: number
  status: 'open' | 'mitigated' | 'accepted' | 'transferred'
  owner: string
  dueDate: Date
}

const CompliancePage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([])

  useEffect(() => {
    loadComplianceData()
  }, [])

  const loadComplianceData = async () => {
    // Mock data for demonstration
    const mockRules: ComplianceRule[] = [
      {
        id: 'rule-001',
        name: 'Data Encryption at Rest',
        description: 'All sensitive data must be encrypted when stored',
        framework: 'GDPR',
        severity: 'critical',
        status: 'compliant',
        lastChecked: new Date(),
        nextAudit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'rule-002',
        name: 'Access Control Management',
        description: 'Implement role-based access control for all systems',
        framework: 'SOC2',
        severity: 'high',
        status: 'compliant',
        lastChecked: new Date(Date.now() - 86400000),
        nextAudit: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'rule-003',
        name: 'Data Retention Policy',
        description: 'Personal data must not be retained longer than necessary',
        framework: 'GDPR',
        severity: 'medium',
        status: 'at-risk',
        lastChecked: new Date(Date.now() - 172800000),
        nextAudit: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'rule-004',
        name: 'Security Incident Response',
        description: 'Documented incident response procedures must be in place',
        framework: 'ISO27001',
        severity: 'high',
        status: 'non-compliant',
        lastChecked: new Date(Date.now() - 604800000),
        nextAudit: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ]

    const mockAuditLogs: AuditLog[] = [
      {
        id: 'log-001',
        timestamp: new Date(),
        user: 'john.doe@company.com',
        action: 'DATA_ACCESS',
        resource: 'customer_database',
        outcome: 'success',
        ipAddress: '192.168.1.100',
        details: 'Accessed customer records for support ticket #12345'
      },
      {
        id: 'log-002',
        timestamp: new Date(Date.now() - 3600000),
        user: 'admin@company.com',
        action: 'PERMISSION_CHANGE',
        resource: 'user_management',
        outcome: 'success',
        ipAddress: '192.168.1.50',
        details: 'Updated user permissions for sarah.chen@company.com'
      },
      {
        id: 'log-003',
        timestamp: new Date(Date.now() - 7200000),
        user: 'api_service',
        action: 'DATA_EXPORT',
        resource: 'analytics_data',
        outcome: 'failure',
        ipAddress: '10.0.0.25',
        details: 'Failed to export analytics data due to permission denied'
      }
    ]

    const mockRiskAssessments: RiskAssessment[] = [
      {
        id: 'risk-001',
        title: 'Unauthorized Data Access',
        category: 'security',
        riskLevel: 'high',
        probability: 0.3,
        impact: 0.8,
        status: 'open',
        owner: 'Security Team',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'risk-002',
        title: 'Data Breach Incident',
        category: 'data',
        riskLevel: 'critical',
        probability: 0.2,
        impact: 0.9,
        status: 'mitigated',
        owner: 'IT Team',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    ]

    setComplianceRules(mockRules)
    setAuditLogs(mockAuditLogs)
    setRiskAssessments(mockRiskAssessments)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800 border-green-200'
      case 'non-compliant': return 'bg-red-100 text-red-800 border-red-200'
      case 'at-risk': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'success': return 'bg-green-100 text-green-800 border-green-200'
      case 'failure': return 'bg-red-100 text-red-800 border-red-200'
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'open': return 'bg-red-100 text-red-800 border-red-200'
      case 'mitigated': return 'bg-green-100 text-green-800 border-green-200'
      case 'accepted': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'transferred': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'non-compliant': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'at-risk': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'pending': return <Clock className="w-4 h-4 text-gray-500" />
      default: return <Shield className="w-4 h-4 text-gray-400" />
    }
  }

  const complianceScore = Math.round((complianceRules.filter(r => r.status === 'compliant').length / complianceRules.length) * 100)
  const criticalIssues = complianceRules.filter(r => r.severity === 'critical' && r.status !== 'compliant').length
  const openRisks = riskAssessments.filter(r => r.status === 'open').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance & Governance</h1>
          <p className="text-gray-600">Monitor compliance status and manage regulatory requirements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="gap-2">
            <FileText className="w-4 h-4" />
            Generate Audit
          </Button>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{complianceScore}%</p>
                <p className="text-xs text-gray-500">Compliance Score</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress value={complianceScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalIssues}</p>
                <p className="text-xs text-gray-500">Critical Issues</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Require immediate attention
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{auditLogs.length}</p>
                <p className="text-xs text-gray-500">Audit Events</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">{openRisks}</p>
                <p className="text-xs text-gray-500">Open Risks</p>
              </div>
              <Flag className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Pending mitigation
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2">
            <Shield className="w-4 h-4" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <Activity className="w-4 h-4" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <Flag className="w-4 h-4" />
            Risk Assessment
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Compliance Framework Status */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Framework Status</CardTitle>
              <CardDescription>Status across different regulatory frameworks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['GDPR', 'SOC2', 'HIPAA', 'PCI-DSS', 'ISO27001'].map((framework) => {
                  const frameworkRules = complianceRules.filter(r => r.framework === framework)
                  const compliantCount = frameworkRules.filter(r => r.status === 'compliant').length
                  const score = frameworkRules.length > 0 ? Math.round((compliantCount / frameworkRules.length) * 100) : 0
                  
                  return (
                    <div key={framework} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{framework}</h4>
                        <span className="text-sm font-medium">{score}%</span>
                      </div>
                      <Progress value={score} className="h-2 mb-2" />
                      <div className="text-xs text-gray-600">
                        {compliantCount}/{frameworkRules.length} compliant rules
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Compliance Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Compliance Activity</CardTitle>
              <CardDescription>Latest compliance-related events and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '2 hours ago', event: 'GDPR compliance check completed', status: 'success', user: 'System' },
                  { time: '6 hours ago', event: 'Security incident response plan updated', status: 'success', user: 'Security Team' },
                  { time: '1 day ago', event: 'Data retention policy violation detected', status: 'warning', user: 'Compliance Monitor' },
                  { time: '2 days ago', event: 'SOC2 audit preparation completed', status: 'success', user: 'Audit Team' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-4">
            {complianceRules.map((rule) => (
              <Card key={rule.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {getStatusIcon(rule.status)}
                        {rule.name}
                      </CardTitle>
                      <CardDescription>{rule.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rule.framework}</Badge>
                      <Badge className={getSeverityColor(rule.severity)}>
                        {rule.severity}
                      </Badge>
                      <Badge className={getStatusColor(rule.status)}>
                        {rule.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Last Checked:</span> {rule.lastChecked.toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Next Audit:</span> {rule.nextAudit.toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete audit log of system activities and access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.action}</span>
                        <Badge className={getStatusColor(log.outcome)}>
                          {log.outcome}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{log.details}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>User: {log.user}</span>
                        <span>Resource: {log.resource}</span>
                        <span>IP: {log.ipAddress}</span>
                        <span>Time: {log.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-6">
          <div className="grid gap-4">
            {riskAssessments.map((risk) => (
              <Card key={risk.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{risk.title}</CardTitle>
                      <CardDescription>Category: {risk.category}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(risk.riskLevel)}>
                        {risk.riskLevel} risk
                      </Badge>
                      <Badge className={getStatusColor(risk.status)}>
                        {risk.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{Math.round(risk.probability * 100)}%</div>
                      <div className="text-xs text-gray-500">Probability</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{Math.round(risk.impact * 100)}%</div>
                      <div className="text-xs text-gray-500">Impact</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(risk.probability * risk.impact * 100)}%</div>
                      <div className="text-xs text-gray-500">Risk Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Owner:</span> {risk.owner}
                    </div>
                    <div>
                      <span className="font-medium">Due Date:</span> {risk.dueDate.toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Mitigate
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <FileText className="w-3 h-3" />
                      Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Compliance Reports</h3>
            <p className="text-gray-600 mb-4">Generate comprehensive compliance and audit reports</p>
            <Button>Generate Report</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default CompliancePage