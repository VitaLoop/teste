"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  FileDown,
  Search,
  Filter,
  CalendarIcon,
  RefreshCw,
  LockIcon,
  UsersIcon,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { formatCurrency } from "@/lib/format"
import { PrintLayout } from "@/components/print-layout"
import { exportTransacoesExcel } from "@/lib/excel-export"
import { toast } from "@/components/ui/use-toast"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { cn } from "@/lib/utils"
import type { Transacao } from "@/types/schema"

type RelatorioGeralProps = {
  transacoesIniciais: Transacao[]
  isAdminMode: boolean
}

export function RelatorioGeral({ transacoesIniciais, isAdminMode }: RelatorioGeralProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [mesFiltro, setMesFiltro] = useState<string>("")
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString())
  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | undefined>(undefined)
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | undefined>(undefined)
  const [modoVisualizacao, setModoVisualizacao] = useState<"detalhado" | "basico">("detalhado")

  // Gerar anos para o filtro (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (anoAtual - i).toString())
  }, [])

  // Filtrar transações por mês, ano e termo de busca
  const transacoesFiltradas = useMemo(() => {
    return transacoesIniciais
      .filter((transacao) => {
        const dataTransacao = new Date(transacao.data)
        const mesMatch = mesFiltro ? dataTransacao.getMonth() + 1 === Number.parseInt(mesFiltro) : true
        const anoMatch = anoFiltro ? dataTransacao.getFullYear() === Number.parseInt(anoFiltro) : true
        const searchMatch = searchTerm
          ? transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transacao.responsavel.toLowerCase().includes(searchTerm.toLowerCase())
          : true
        const dataInicioMatch = dataInicioFiltro ? dataTransacao >= dataInicioFiltro : true
        const dataFimMatch = dataFimFiltro ? dataTransacao <= dataFimFiltro : true

        return mesMatch && anoMatch && searchMatch && dataInicioMatch && dataFimMatch
      })
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [transacoesIniciais, mesFiltro, anoFiltro, searchTerm, dataInicioFiltro, dataFimFiltro])

  // Calcular totais
  const totais = useMemo(() => {
    const totalEntradas = transacoesFiltradas.filter((t) => t.tipo === "entrada").reduce((sum, t) => sum + t.valor, 0)
    const totalSaidas = transacoesFiltradas.filter((t) => t.tipo === "saida").reduce((sum, t) => sum + t.valor, 0)

    // Agrupar por categoria
    const categorias = transacoesFiltradas.reduce(
      (acc, transacao) => {
        const categoria = transacao.categoria
        if (!acc[categoria]) {
          acc[categoria] = {
            entradas: 0,
            saidas: 0,
          }
        }

        if (transacao.tipo === "entrada") {
          acc[categoria].entradas += transacao.valor
        } else {
          acc[categoria].saidas += transacao.valor
        }

        return acc
      },
      {} as Record<string, { entradas: number; saidas: number }>,
    )

    return {
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas,
      categorias,
    }
  }, [transacoesFiltradas])

  const handleExportExcel = () => {
    const fileName = exportTransacoesExcel(transacoesFiltradas, {
      mes: mesFiltro || undefined,
      ano: anoFiltro || undefined,
    })

    toast({
      title: "Excel exportado",
      description: `O relatório foi exportado como ${fileName}.`,
    })
  }

  const handleExportPDF = () => {
    // Criar novo documento PDF
    const doc = new jsPDF()

    // Adicionar título
    doc.setFontSize(18)
    doc.text("Relatório Financeiro", 14, 22)

    // Adicionar período
    doc.setFontSize(12)
    const periodoTexto = `Período: ${mesFiltro ? `Mês ${mesFiltro}` : "Todos os meses"} de ${anoFiltro || new Date().getFullYear()}`
    doc.text(periodoTexto, 14, 32)

    // Preparar dados para a tabela
    const tableData = transacoesFiltradas.map((t) => [
      format(new Date(t.data), "dd/MM/yyyy"),
      t.tipo === "entrada" ? "Entrada" : "Saída",
      formatCurrency(t.valor),
      t.descricao,
      t.categoria,
      modoVisualizacao === "detalhado" ? t.responsavel : "",
    ])

    // Adicionar tabela
    doc.autoTable({
      startY: 40,
      head: [
        ["Data", "Tipo", "Valor", "Descrição", "Categoria", modoVisualizacao === "detalhado" ? "Responsável" : ""],
      ],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      footStyles: { fillColor: [41, 128, 185], textColor: 255 },
      foot: [
        ["", "Total Entradas", formatCurrency(totais.entradas), "", "", ""],
        ["", "Total Saídas", formatCurrency(totais.saidas), "", "", ""],
        ["", "Saldo", formatCurrency(totais.saldo), "", "", ""],
      ],
    })

    // Salvar o PDF
    const fileName = `Relatorio_${modoVisualizacao === "detalhado" ? "Detalhado" : "Basico"}_${mesFiltro || "Todos"}_${anoFiltro || new Date().getFullYear()}.pdf`
    doc.save(fileName)

    toast({
      title: "PDF exportado",
      description: "O relatório foi exportado em formato PDF.",
    })
  }

  const getNomeMes = (numeroMes: string) => {
    const meses = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]
    return meses[Number.parseInt(numeroMes) - 1]
  }

  const limparFiltros = () => {
    setSearchTerm("")
    setMesFiltro("")
    setAnoFiltro(new Date().getFullYear().toString())
    setDataInicioFiltro(undefined)
    setDataFimFiltro(undefined)
  }

  return (
    <PrintLayout title="Relatório Geral">
      <div className="space-y-6">
        {/* Seletor de modo de visualização */}
        <div className="flex justify-center mb-6">
          <Tabs
            defaultValue="detalhado"
            value={modoVisualizacao}
            onValueChange={(value) => setModoVisualizacao(value as "detalhado" | "basico")}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detalhado" disabled={!isAdminMode} className="flex items-center gap-2">
                <LockIcon className="h-4 w-4" />
                Detalhado (Admin)
              </TabsTrigger>
              <TabsTrigger value="basico" className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4" />
                Básico (Grupo)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <Card className="overflow-hidden border-2 border-green-200 dark:border-green-900 shadow-md dark:shadow-emerald-900/20">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 pb-2 pt-4 px-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-green-700 dark:text-green-300 text-sm md:text-lg flex items-center gap-2">
                  <ArrowUpCircle className="h-5 w-5" />
                  <span>Total de Entradas</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="text-lg md:text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(totais.entradas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {transacoesFiltradas.filter((t) => t.tipo === "entrada").length} transações
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-2 border-red-200 dark:border-red-900 shadow-md dark:shadow-red-900/20">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 pb-2 pt-4 px-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-red-700 dark:text-red-300 text-sm md:text-lg flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5" />
                  <span>Total de Saídas</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="text-lg md:text-2xl font-bold text-red-700 dark:text-red-400">
                {formatCurrency(totais.saidas)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {transacoesFiltradas.filter((t) => t.tipo === "saida").length} transações
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "overflow-hidden border-2 shadow-md",
              totais.saldo >= 0
                ? "border-blue-200 dark:border-blue-900 dark:shadow-blue-900/20"
                : "border-amber-200 dark:border-amber-900 dark:shadow-amber-900/20",
            )}
          >
            <CardHeader
              className={cn(
                "pb-2 pt-4 px-4 bg-gradient-to-r",
                totais.saldo >= 0
                  ? "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
                  : "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900",
              )}
            >
              <div className="flex justify-between items-center">
                <CardTitle
                  className={cn(
                    "text-sm md:text-lg flex items-center gap-2",
                    totais.saldo >= 0 ? "text-blue-700 dark:text-blue-300" : "text-amber-700 dark:text-amber-300",
                  )}
                >
                  <RefreshCw className="h-5 w-5" />
                  <span>Saldo Atual</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div
                className={cn(
                  "text-lg md:text-2xl font-bold",
                  totais.saldo >= 0 ? "text-blue-700 dark:text-blue-400" : "text-amber-700 dark:text-amber-400",
                )}
              >
                {formatCurrency(totais.saldo)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totais.saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros e ações */}
        <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden transition-all duration-300">
          <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={limparFiltros} className="text-xs h-8">
                  Limpar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {/* Filtros básicos sempre visíveis */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar transações..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {getNomeMes(mes.toString())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Button onClick={handleExportExcel} variant="outline" className="flex-1">
                  <FileDown className="mr-2 h-4 w-4" />
                  Excel
                </Button>
                <Button onClick={handleExportPDF} variant="outline" className="flex-1">
                  <FileDown className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInicio">Data Inicial</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-10"
                        id="dataInicio"
                      >
                        {dataInicioFiltro ? (
                          format(dataInicioFiltro, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span className="text-muted-foreground">Selecionar data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataInicioFiltro}
                        onSelect={setDataInicioFiltro}
                        initialFocus
                        className="border rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataFim">Data Final</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-10"
                        id="dataFim"
                      >
                        {dataFimFiltro ? (
                          format(dataFimFiltro, "dd/MM/yyyy", { locale: pt })
                        ) : (
                          <span className="text-muted-foreground">Selecionar data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataFimFiltro}
                        onSelect={setDataFimFiltro}
                        initialFocus
                        className="border rounded-md"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo baseado no modo de visualização */}
        <TabsContent value="detalhado" className="mt-0 space-y-6">
          {/* Resumo por categoria - apenas no modo detalhado */}
          <Card className="border shadow-sm dark:shadow-gray-900/30">
            <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
              <CardTitle className="text-sm md:text-base">Resumo por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                      <TableHead className="font-semibold">Categoria</TableHead>
                      <TableHead className="text-right font-semibold">Entradas</TableHead>
                      <TableHead className="text-right font-semibold">Saídas</TableHead>
                      <TableHead className="text-right font-semibold">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(totais.categorias).length > 0 ? (
                      Object.entries(totais.categorias).map(([categoria, valores]) => (
                        <TableRow
                          key={categoria}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full font-normal">
                              {categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(valores.entradas)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(valores.saidas)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                valores.entradas - valores.saidas >= 0
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {formatCurrency(valores.entradas - valores.saidas)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                          Nenhuma transação encontrada para o período selecionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de transações detalhada */}
          <Card className="border shadow-sm dark:shadow-gray-900/30">
            <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
              <CardTitle className="text-sm md:text-base">Transações Detalhadas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="text-right font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Descrição</TableHead>
                      <TableHead className="font-semibold">Categoria</TableHead>
                      <TableHead className="font-semibold">Responsável</TableHead>
                      <TableHead className="font-semibold">Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesFiltradas.length > 0 ? (
                      transacoesFiltradas.map((transacao) => (
                        <TableRow
                          key={transacao.id}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell>{format(new Date(transacao.data), "dd/MM/yyyy", { locale: pt })}</TableCell>
                          <TableCell>
                            {transacao.tipo === "entrada" ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1"
                              >
                                <ArrowUpCircle className="h-3 w-3" />
                                Entrada
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1"
                              >
                                <ArrowDownCircle className="h-3 w-3" />
                                Saída
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                transacao.tipo === "entrada"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {formatCurrency(transacao.valor)}
                            </span>
                          </TableCell>
                          <TableCell>{transacao.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full font-normal">
                              {transacao.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell>{transacao.responsavel}</TableCell>
                          <TableCell>{transacao.observacoes || "-"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          Nenhuma transação encontrada para o período selecionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="basico" className="mt-0 space-y-6">
          {/* Resumo por categoria - versão simplificada */}
          <Card className="border shadow-sm dark:shadow-gray-900/30">
            <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
              <CardTitle className="text-sm md:text-base">Resumo por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                      <TableHead className="font-semibold">Categoria</TableHead>
                      <TableHead className="text-right font-semibold">Entradas</TableHead>
                      <TableHead className="text-right font-semibold">Saídas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(totais.categorias).length > 0 ? (
                      Object.entries(totais.categorias).map(([categoria, valores]) => (
                        <TableRow
                          key={categoria}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full font-normal">
                              {categoria}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(valores.entradas)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(valores.saidas)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          Nenhuma transação encontrada para o período selecionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de transações simplificada */}
          <Card className="border shadow-sm dark:shadow-gray-900/30">
            <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
              <CardTitle className="text-sm md:text-base">Transações Simplificadas</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                      <TableHead className="font-semibold">Data</TableHead>
                      <TableHead className="font-semibold">Tipo</TableHead>
                      <TableHead className="text-right font-semibold">Valor</TableHead>
                      <TableHead className="font-semibold">Descrição</TableHead>
                      <TableHead className="font-semibold">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacoesFiltradas.length > 0 ? (
                      transacoesFiltradas.map((transacao) => (
                        <TableRow
                          key={transacao.id}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell>{format(new Date(transacao.data), "dd/MM/yyyy", { locale: pt })}</TableCell>
                          <TableCell>
                            {transacao.tipo === "entrada" ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800 flex items-center gap-1"
                              >
                                <ArrowUpCircle className="h-3 w-3" />
                                Entrada
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800 flex items-center gap-1"
                              >
                                <ArrowDownCircle className="h-3 w-3" />
                                Saída
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span
                              className={
                                transacao.tipo === "entrada"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }
                            >
                              {formatCurrency(transacao.valor)}
                            </span>
                          </TableCell>
                          <TableCell>{transacao.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full font-normal">
                              {transacao.categoria}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma transação encontrada para o período selecionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </PrintLayout>
  )
}

