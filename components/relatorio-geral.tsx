"use client"

import { useState, useMemo } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PrintLayout } from "@/components/print-layout"
import {
  Printer,
  FileDown,
  Filter,
  ArrowUpDown,
  CalendarIcon,
  BarChart3,
  PieChartIcon,
  LineChartIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrency } from "@/lib/format"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { pt } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import type { Transacao } from "@/types/schema"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import "jspdf-autotable"

type RelatorioGeralProps = {
  transacoes: Transacao[]
}

export function RelatorioGeral({ transacoes }: RelatorioGeralProps) {
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString())
  const [mesFiltro, setMesFiltro] = useState<string>("todos")
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas")
  const [dataInicioFiltro, setDataInicioFiltro] = useState<Date | undefined>(undefined)
  const [dataFimFiltro, setDataFimFiltro] = useState<Date | undefined>(undefined)
  const [ordenacao, setOrdenacao] = useState<"valor" | "data" | "categoria">("data")
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<"asc" | "desc">("desc")
  const [activeTab, setActiveTab] = useState("resumo")
  const [mostrarApenasPositivos, setMostrarApenasPositivos] = useState(false)
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Gerar anos para o filtro (últimos 5 anos)
  const anos = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => (anoAtual - i).toString())
  }, [])

  // Obter todas as categorias únicas
  const categorias = useMemo(() => {
    const categoriasSet = new Set<string>()
    transacoes.forEach((t) => categoriasSet.add(t.categoria))
    return Array.from(categoriasSet).sort()
  }, [transacoes])

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return transacoes
      .filter((transacao) => {
        const dataTransacao = new Date(transacao.data)

        // Filtro por ano
        const anoMatch = anoFiltro === "todos" ? true : dataTransacao.getFullYear().toString() === anoFiltro

        // Filtro por mês
        const mesMatch = mesFiltro === "todos" ? true : dataTransacao.getMonth() + 1 === Number.parseInt(mesFiltro)

        // Filtro por categoria
        const categoriaMatch = categoriaFiltro === "todas" ? true : transacao.categoria === categoriaFiltro

        // Filtro por data de início
        const dataInicioMatch = !dataInicioFiltro ? true : dataTransacao >= dataInicioFiltro

        // Filtro por data de fim
        const dataFimMatch = !dataFimFiltro ? true : dataTransacao <= dataFimFiltro

        // Filtro para mostrar apenas saldos positivos (opcional)
        const positivoMatch = !mostrarApenasPositivos ? true : transacao.tipo === "entrada"

        // Filtro por termo de pesquisa
        const searchMatch = !searchTerm
          ? true
          : transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transacao.responsavel.toLowerCase().includes(searchTerm.toLowerCase())

        return anoMatch && mesMatch && categoriaMatch && dataInicioMatch && dataFimMatch && positivoMatch && searchMatch
      })
      .sort((a, b) => {
        // Ordenação
        if (ordenacao === "valor") {
          return direcaoOrdenacao === "asc" ? a.valor - b.valor : b.valor - a.valor
        } else if (ordenacao === "data") {
          return direcaoOrdenacao === "asc"
            ? new Date(a.data).getTime() - new Date(b.data).getTime()
            : new Date(b.data).getTime() - new Date(a.data).getTime()
        } else if (ordenacao === "categoria") {
          return direcaoOrdenacao === "asc"
            ? a.categoria.localeCompare(b.categoria)
            : b.categoria.localeCompare(a.categoria)
        }
        return 0
      })
  }, [
    transacoes,
    anoFiltro,
    mesFiltro,
    categoriaFiltro,
    dataInicioFiltro,
    dataFimFiltro,
    ordenacao,
    direcaoOrdenacao,
    mostrarApenasPositivos,
    searchTerm,
  ])

  // Calcular dados por mês
  const dadosPorMes = useMemo(() => {
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

    const dados = meses.map((mes, index) => {
      const transacoesMes = transacoesFiltradas.filter((t) => {
        const data = new Date(t.data)
        return data.getMonth() === index
      })

      const entradas = transacoesMes.filter((t) => t.tipo === "entrada").reduce((sum, t) => sum + t.valor, 0)

      const saidas = transacoesMes.filter((t) => t.tipo === "saida").reduce((sum, t) => sum + t.valor, 0)

      return {
        mes,
        entradas,
        saidas,
        saldo: entradas - saidas,
      }
    })

    return dados
  }, [transacoesFiltradas])

  // Calcular dados por categoria
  const dadosPorCategoria = useMemo(() => {
    const categorias = new Map<string, { entradas: number; saidas: number }>()

    transacoesFiltradas.forEach((t) => {
      if (!categorias.has(t.categoria)) {
        categorias.set(t.categoria, { entradas: 0, saidas: 0 })
      }

      const dados = categorias.get(t.categoria)!
      if (t.tipo === "entrada") {
        dados.entradas += t.valor
      } else {
        dados.saidas += t.valor
      }
    })

    return Array.from(categorias.entries()).map(([categoria, dados]) => ({
      categoria,
      entradas: dados.entradas,
      saidas: dados.saidas,
      total: dados.entradas - dados.saidas,
    }))
  }, [transacoesFiltradas])

  // Calcular totais
  const totais = useMemo(() => {
    const totalEntradas = transacoesFiltradas.filter((t) => t.tipo === "entrada").reduce((sum, t) => sum + t.valor, 0)

    const totalSaidas = transacoesFiltradas.filter((t) => t.tipo === "saida").reduce((sum, t) => sum + t.valor, 0)

    return {
      entradas: totalEntradas,
      saidas: totalSaidas,
      saldo: totalEntradas - totalSaidas,
    }
  }, [transacoesFiltradas])

  // Dados para o gráfico de pizza
  const dadosPizza = useMemo(() => {
    const entradasPorCategoria = new Map<string, number>()
    const saidasPorCategoria = new Map<string, number>()

    transacoesFiltradas.forEach((t) => {
      if (t.tipo === "entrada") {
        entradasPorCategoria.set(t.categoria, (entradasPorCategoria.get(t.categoria) || 0) + t.valor)
      } else {
        saidasPorCategoria.set(t.categoria, (saidasPorCategoria.get(t.categoria) || 0) + t.valor)
      }
    })

    return {
      entradas: Array.from(entradasPorCategoria.entries()).map(([name, value]) => ({ name, value })),
      saidas: Array.from(saidasPorCategoria.entries()).map(([name, value]) => ({ name, value })),
    }
  }, [transacoesFiltradas])

  // Dados para o gráfico de linha (evolução do saldo)
  const dadosEvolucaoSaldo = useMemo(() => {
    // Criar um mapa de datas para saldos
    const saldosPorData = new Map<string, number>()
    let saldoAcumulado = 0

    // Ordenar transações por data
    const transacoesOrdenadas = [...transacoesFiltradas].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
    )

    // Calcular saldo acumulado para cada data
    transacoesOrdenadas.forEach((t) => {
      const dataFormatada = format(new Date(t.data), "dd/MM/yyyy")
      const valor = t.tipo === "entrada" ? t.valor : -t.valor
      saldoAcumulado += valor
      saldosPorData.set(dataFormatada, saldoAcumulado)
    })

    // Converter para array para o gráfico
    return Array.from(saldosPorData.entries()).map(([data, saldo]) => ({
      data,
      saldo,
    }))
  }, [transacoesFiltradas])

  // Cores para os gráficos - mais harmoniosas para modo claro e escuro
  const COLORS_ENTRADAS = ["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#ecfdf5"]
  const COLORS_SAIDAS = ["#ef4444", "#f87171", "#fca5a5", "#fecaca", "#fee2e2", "#fef2f2"]
  const COLORS_SALDO = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"]

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    // Preparar dados para exportação
    const dataToExport = [
      // Cabeçalho
      ["Relatório Geral"],
      [""],
      ["Período:", getDescricaoPeriodo()],
      [""],

      // Resumo
      ["Resumo Financeiro"],
      ["Total de Entradas", formatCurrency(totais.entradas)],
      ["Total de Saídas", formatCurrency(totais.saidas)],
      ["Saldo", formatCurrency(totais.saldo)],
      [""],

      // Dados mensais
      ["Dados Mensais"],
      ["Mês", "Entradas", "Saídas", "Saldo"],
      ...dadosPorMes.map((d) => [d.mes, d.entradas, d.saidas, d.saldo]),
      [""],

      // Dados por categoria
      ["Dados por Categoria"],
      ["Categoria", "Entradas", "Saídas", "Total"],
      ...dadosPorCategoria.map((d) => [d.categoria, d.entradas, d.saidas, d.total]),
    ]

    // Criar planilha
    const ws = XLSX.utils.aoa_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Geral")

    // Exportar arquivo
    XLSX.writeFile(wb, `Relatorio_Geral_${getDescricaoPeriodo()}.xlsx`)
  }

  const handleExportPDF = () => {
    // Criar novo documento PDF
    const doc = new jsPDF()

    // Adicionar título
    doc.setFontSize(18)
    doc.text("Relatório Geral", 14, 22)

    // Adicionar período
    doc.setFontSize(12)
    doc.text(`Período: ${getDescricaoPeriodo()}`, 14, 32)

    // Adicionar resumo
    doc.setFontSize(14)
    doc.text("Resumo Financeiro", 14, 45)

    doc.setFontSize(12)
    doc.text(`Total de Entradas: ${formatCurrency(totais.entradas)}`, 20, 55)
    doc.text(`Total de Saídas: ${formatCurrency(totais.saidas)}`, 20, 62)
    doc.text(`Saldo: ${formatCurrency(totais.saldo)}`, 20, 69)

    // Adicionar dados mensais
    doc.setFontSize(14)
    doc.text("Dados Mensais", 14, 82)

    doc.autoTable({
      startY: 85,
      head: [["Mês", "Entradas", "Saídas", "Saldo"]],
      body: dadosPorMes.map((d) => [
        d.mes,
        formatCurrency(d.entradas),
        formatCurrency(d.saidas),
        formatCurrency(d.saldo),
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    })

    // Adicionar dados por categoria
    const finalY = (doc as any).lastAutoTable.finalY || 150
    doc.setFontSize(14)
    doc.text("Dados por Categoria", 14, finalY + 15)

    doc.autoTable({
      startY: finalY + 18,
      head: [["Categoria", "Entradas", "Saídas", "Total"]],
      body: dadosPorCategoria.map((d) => [
        d.categoria,
        formatCurrency(d.entradas),
        formatCurrency(d.saidas),
        formatCurrency(d.total),
      ]),
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    })

    // Salvar o PDF
    doc.save(`Relatorio_Geral_${getDescricaoPeriodo()}.pdf`)
  }

  // Função para obter descrição do período para relatórios
  const getDescricaoPeriodo = () => {
    let descricao = ""

    if (dataInicioFiltro && dataFimFiltro) {
      descricao = `${format(dataInicioFiltro, "dd/MM/yyyy")} a ${format(dataFimFiltro, "dd/MM/yyyy")}`
    } else if (mesFiltro !== "todos" && anoFiltro !== "todos") {
      const nomeMes = getNomeMes(Number.parseInt(mesFiltro))
      descricao = `${nomeMes}/${anoFiltro}`
    } else if (mesFiltro !== "todos") {
      descricao = `${getNomeMes(Number.parseInt(mesFiltro))}`
    } else if (anoFiltro !== "todos") {
      descricao = anoFiltro
    } else {
      descricao = "Todo o período"
    }

    if (categoriaFiltro !== "todas") {
      descricao += ` - Categoria: ${categoriaFiltro}`
    }

    return descricao
  }

  const getNomeMes = (numeroMes: number) => {
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
    return meses[numeroMes - 1]
  }

  // Alternar direção de ordenação
  const toggleOrdenacao = (campo: "valor" | "data" | "categoria") => {
    if (ordenacao === campo) {
      setDirecaoOrdenacao(direcaoOrdenacao === "asc" ? "desc" : "asc")
    } else {
      setOrdenacao(campo)
      setDirecaoOrdenacao("desc")
    }
  }

  // Limpar todos os filtros
  const limparFiltros = () => {
    setAnoFiltro("todos")
    setMesFiltro("todos")
    setCategoriaFiltro("todas")
    setDataInicioFiltro(undefined)
    setDataFimFiltro(undefined)
    setMostrarApenasPositivos(false)
    setOrdenacao("data")
    setDirecaoOrdenacao("desc")
    setSearchTerm("")
  }

  return (
    <PrintLayout title="Relatório Geral">
      <div className="space-y-6">
        {/* Cabeçalho com título e botões de ação */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-bold">Relatório Geral</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Visão geral das finanças da igreja</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleExportExcel}
              className="print:hidden h-9 px-2 md:px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white"
            >
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Excel</span>
            </Button>

            <Button
              onClick={handleExportPDF}
              className="print:hidden h-9 px-2 md:px-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              <FileDown className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">PDF</span>
            </Button>

            <Button onClick={handlePrint} className="print:hidden h-9 px-2 md:px-3">
              <Printer className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Imprimir</span>
            </Button>
          </div>
        </div>

        {/* Cards de resumo financeiro */}
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

        {/* Painel de filtros compacto */}
        <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden transition-all duration-300">
          <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                  className="text-xs h-8"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                  {filtrosExpandidos ? "Menos filtros" : "Mais filtros"}
                </Button>
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

              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger id="anoFiltro" className="h-10">
                  <SelectValue placeholder="Selecionar ano" />
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

              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger id="mesFiltro" className="h-10">
                  <SelectValue placeholder="Selecionar mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                    <SelectItem key={mes} value={mes.toString()}>
                      {getNomeMes(mes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                <SelectTrigger id="categoriaFiltro" className="h-10">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as categorias</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>
                      {categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtros avançados (expandíveis) */}
            {filtrosExpandidos && (
              <div className="mt-4 pt-4 border-t border-border dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

                  <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-2">
                    <Label>Ordenação</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={ordenacao === "data" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleOrdenacao("data")}
                        className="flex-1 h-10"
                      >
                        Data
                        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={ordenacao === "valor" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleOrdenacao("valor")}
                        className="flex-1 h-10"
                      >
                        Valor
                        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={ordenacao === "categoria" ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleOrdenacao("categoria")}
                        className="flex-1 h-10"
                      >
                        Categoria
                        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 col-span-1 sm:col-span-2 md:col-span-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mostrarApenasPositivos"
                        checked={mostrarApenasPositivos}
                        onCheckedChange={(checked) => setMostrarApenasPositivos(checked as boolean)}
                        className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                      />
                      <Label
                        htmlFor="mostrarApenasPositivos"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Mostrar apenas entradas (valores positivos)
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abas de conteúdo */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 h-10 bg-muted/80 dark:bg-gray-800/80 p-1 rounded-lg">
            <TabsTrigger
              value="resumo"
              className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <div className="flex items-center gap-1.5">
                <PieChartIcon className="h-4 w-4" />
                <span>Resumo</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="mensal"
              className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4" />
                <span>Dados Mensais</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="categorias"
              className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <div className="flex items-center gap-1.5">
                <Filter className="h-4 w-4" />
                <span>Por Categoria</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="evolucao"
              className="text-xs md:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <div className="flex items-center gap-1.5">
                <LineChartIcon className="h-4 w-4" />
                <span>Evolução</span>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* Aba de Resumo */}
          <TabsContent value="resumo" className="space-y-6">
            {/* Gráficos de pizza */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
                <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span>Entradas por Categoria</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPizza.entradas}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosPizza.entradas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_ENTRADAS[index % COLORS_ENTRADAS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            padding: "8px 12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
                <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span>Saídas por Categoria</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dadosPizza.saidas}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {dadosPizza.saidas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_SAIDAS[index % COLORS_SAIDAS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatCurrency(value as number)}
                          contentStyle={{
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            padding: "8px 12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informações do período */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Informações do Período</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Período analisado:</span>
                      <span className="text-sm font-medium">{getDescricaoPeriodo()}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total de transações:</span>
                      <Badge variant="outline" className="rounded-full">
                        {transacoesFiltradas.length}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Maior entrada:</span>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(
                          Math.max(...transacoesFiltradas.filter((t) => t.tipo === "entrada").map((t) => t.valor), 0),
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Categorias:</span>
                      <Badge variant="outline" className="rounded-full">
                        {dadosPorCategoria.length}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Transações de entrada:</span>
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800 rounded-full"
                      >
                        {transacoesFiltradas.filter((t) => t.tipo === "entrada").length}
                      </Badge>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Maior saída:</span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {formatCurrency(
                          Math.max(...transacoesFiltradas.filter((t) => t.tipo === "saida").map((t) => t.valor), 0),
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Dados Mensais */}
          <TabsContent value="mensal" className="space-y-6">
            {/* Gráfico de barras mensal */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Entradas e Saídas Mensais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="mes" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#cbd5e1" }} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          padding: "8px 12px",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="circle" />
                      <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de dados mensais */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>Dados Mensais Detalhados</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                        <TableHead className="font-semibold">Mês</TableHead>
                        <TableHead className="text-right font-semibold">Entradas</TableHead>
                        <TableHead className="text-right font-semibold">Saídas</TableHead>
                        <TableHead className="text-right font-semibold">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosPorMes.map((dados) => (
                        <TableRow
                          key={dados.mes}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell className="font-medium">{dados.mes}</TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(dados.entradas)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(dados.saidas)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${dados.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                          >
                            {formatCurrency(dados.saldo)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 dark:bg-gray-800/30 hover:bg-muted/50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totais.entradas)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(totais.saidas)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${totais.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                        >
                          {formatCurrency(totais.saldo)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Categorias */}
          <TabsContent value="categorias" className="space-y-6">
            {/* Tabela de dados por categoria */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Dados por Categoria</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOrdenacao("categoria")}
                      className="h-8 text-xs"
                    >
                      Categoria
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOrdenacao("valor")}
                      className="h-8 text-xs"
                    >
                      Valor
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="overflow-x-auto">
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
                      {dadosPorCategoria.map((dados) => (
                        <TableRow
                          key={dados.categoria}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell className="font-medium">{dados.categoria}</TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(dados.entradas)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(dados.saidas)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${dados.total >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                          >
                            {formatCurrency(dados.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 dark:bg-gray-800/30 hover:bg-muted/50 dark:hover:bg-gray-800/50">
                        <TableCell className="font-bold">TOTAL</TableCell>
                        <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(totais.entradas)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(totais.saidas)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${totais.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`}
                        >
                          {formatCurrency(totais.saldo)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de barras por categoria */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span>Entradas e Saídas por Categoria</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosPorCategoria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        type="number"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <YAxis
                        dataKey="categoria"
                        type="category"
                        width={150}
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          padding: "8px 12px",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="circle" />
                      <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                      <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Nova aba de Evolução */}
          <TabsContent value="evolucao" className="space-y-6">
            {/* Gráfico de linha para evolução do saldo */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4" />
                  <span>Evolução do Saldo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dadosEvolucaoSaldo}>
                      <defs>
                        <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="data" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={{ stroke: "#cbd5e1" }} />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(value) => `R$ ${value}`}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value as number)}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                          padding: "8px 12px",
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} iconType="circle" />
                      <Area
                        type="monotone"
                        dataKey="saldo"
                        name="Saldo"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorSaldo)"
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6, strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Tabela de transações */}
            <Card className="border shadow-sm dark:shadow-gray-900/30 overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-gray-800/50 pb-2 pt-4 px-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm md:text-base flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Transações no Período</span>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleOrdenacao("data")} className="h-8 text-xs">
                      Data
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleOrdenacao("valor")}
                      className="h-8 text-xs"
                    >
                      Valor
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 pb-4 px-4 bg-white dark:bg-gray-900">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 dark:bg-gray-800/50 hover:bg-muted/70 dark:hover:bg-gray-800/70">
                        <TableHead className="font-semibold">Data</TableHead>
                        <TableHead className="font-semibold">Tipo</TableHead>
                        <TableHead className="font-semibold">Descrição</TableHead>
                        <TableHead className="font-semibold">Categoria</TableHead>
                        <TableHead className="text-right font-semibold">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transacoesFiltradas.slice(0, 50).map((transacao) => (
                        <TableRow
                          key={transacao.id}
                          className="border-b border-border/50 dark:border-gray-700/50 hover:bg-muted/30 dark:hover:bg-gray-800/30 transition-colors"
                        >
                          <TableCell>{format(new Date(transacao.data), "dd/MM/yyyy")}</TableCell>
                          <TableCell>
                            {transacao.tipo === "entrada" ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200 dark:border-green-800"
                              >
                                <ArrowUpCircle className="mr-1 h-3 w-3" />
                                Entrada
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200 dark:border-red-800"
                              >
                                <ArrowDownCircle className="mr-1 h-3 w-3" />
                                Saída
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{transacao.descricao}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="rounded-full font-normal">
                              {transacao.categoria}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${transacao.tipo === "entrada" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {formatCurrency(transacao.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {transacoesFiltradas.length > 50 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                            Mostrando 50 de {transacoesFiltradas.length} transações. Refine os filtros para ver mais.
                          </TableCell>
                        </TableRow>
                      )}
                      {transacoesFiltradas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhuma transação encontrada para os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PrintLayout>
  )
}

