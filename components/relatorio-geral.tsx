"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, SearchIcon, FilterIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Transacao } from "@/types/schema"
import { formatCurrency } from "@/lib/format"

// Componente de tooltip personalizado para os gráficos
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-3 rounded-md shadow-md">
        <p className="font-medium">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function RelatorioGeral({ transacoes: initialTransacoes }: { transacoes: Transacao[] }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null)
  const [dataInicio, setDataInicio] = useState<Date | undefined>(undefined)
  const [dataFim, setDataFim] = useState<Date | undefined>(undefined)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Filtrar transações
  const transacoesFiltradas = useMemo(() => {
    return initialTransacoes.filter((transacao) => {
      // Filtro de pesquisa
      const matchesSearch =
        searchTerm === "" ||
        transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transacao.responsavel.toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro de tipo
      const matchesTipo = filtroTipo === null || transacao.tipo === filtroTipo

      // Filtro de categoria
      const matchesCategoria = filtroCategoria === null || transacao.categoria === filtroCategoria

      // Filtro de data
      const matchesDataInicio = dataInicio === undefined || transacao.data >= dataInicio
      const matchesDataFim = dataFim === undefined || transacao.data <= dataFim

      return matchesSearch && matchesTipo && matchesCategoria && matchesDataInicio && matchesDataFim
    })
  }, [searchTerm, filtroTipo, filtroCategoria, dataInicio, dataFim, initialTransacoes])

  // Calcular saldo atual
  const saldoAtual = useMemo(() => {
    return transacoesFiltradas.reduce((acc, transacao) => {
      if (transacao.tipo === "entrada") {
        return acc + transacao.valor
      } else {
        return acc - transacao.valor
      }
    }, 0)
  }, [transacoesFiltradas])

  // Dados para o gráfico de barras
  const dadosGraficoBarras = useMemo(() => {
    const meses: { [key: string]: { entradas: number; saidas: number } } = {}

    transacoesFiltradas.forEach((transacao) => {
      const data = new Date(transacao.data)
      const mes = format(data, "MMM/yyyy", { locale: ptBR })

      if (!meses[mes]) {
        meses[mes] = { entradas: 0, saidas: 0 }
      }

      if (transacao.tipo === "entrada") {
        meses[mes].entradas += transacao.valor
      } else {
        meses[mes].saidas += transacao.valor
      }
    })

    return Object.keys(meses).map((mes) => ({
      mes,
      Entradas: meses[mes].entradas,
      Saídas: meses[mes].saidas,
    }))
  }, [transacoesFiltradas])

  // Dados para o gráfico de pizza
  const dadosGraficoPizza = useMemo(() => {
    const categorias: { [key: string]: number } = {}

    transacoesFiltradas.forEach((transacao) => {
      if (!categorias[transacao.categoria]) {
        categorias[transacao.categoria] = 0
      }

      categorias[transacao.categoria] += transacao.valor
    })

    return Object.keys(categorias).map((categoria) => ({
      name: categoria,
      value: categorias[categoria],
    }))
  }, [transacoesFiltradas])

  // Cores para o gráfico de pizza
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatório Geral</h2>
          <p className="text-muted-foreground">Visualize e exporte relatórios financeiros</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                saldoAtual >= 0 ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400",
              )}
            >
              {formatCurrency(saldoAtual)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Baseado nos filtros aplicados</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Entradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">
              {formatCurrency(
                transacoesFiltradas.filter((t) => t.tipo === "entrada").reduce((acc, t) => acc + t.valor, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transacoesFiltradas.filter((t) => t.tipo === "entrada").length} transações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">
              {formatCurrency(
                transacoesFiltradas.filter((t) => t.tipo === "saida").reduce((acc, t) => acc + t.valor, 0),
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {transacoesFiltradas.filter((t) => t.tipo === "saida").length} transações
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {dataInicio && dataFim ? (
                <>
                  {format(dataInicio, "dd/MM/yyyy")} até {format(dataFim, "dd/MM/yyyy")}
                </>
              ) : dataInicio ? (
                <>A partir de {format(dataInicio, "dd/MM/yyyy")}</>
              ) : dataFim ? (
                <>Até {format(dataFim, "dd/MM/yyyy")}</>
              ) : (
                "Todo o período"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{transacoesFiltradas.length} transações no total</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar transações..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button variant="outline" size="sm" className="gap-2" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <FilterIcon className="h-4 w-4" />
            Filtros
            {mostrarFiltros ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </Button>
        </div>

        {mostrarFiltros && (
          <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
            <CardContent className="pt-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="filtro-tipo">Tipo</Label>
                  <Select value={filtroTipo || ""} onValueChange={(value) => setFiltroTipo(value || null)}>
                    <SelectTrigger id="filtro-tipo">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filtro-categoria">Categoria</Label>
                  <Select value={filtroCategoria || ""} onValueChange={(value) => setFiltroCategoria(value || null)}>
                    <SelectTrigger id="filtro-categoria">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="Oferta">Oferta</SelectItem>
                      <SelectItem value="Despesa">Despesa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2 md:col-span-1">
                  <Label>Período</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataInicio ? format(dataInicio, "dd/MM/yyyy") : <span>De</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dataInicio}
                          onSelect={setDataInicio}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dataFim ? format(dataFim, "dd/MM/yyyy") : <span>Até</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={dataFim} onSelect={setDataFim} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroTipo(null)
                    setFiltroCategoria(null)
                    setDataInicio(undefined)
                    setDataFim(undefined)
                    setSearchTerm("")
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="transacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto">
          <TabsTrigger value="transacoes">Transações</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="transacoes" className="space-y-4">
          <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhuma transação encontrada com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesFiltradas.map((transacao) => (
                      <TableRow key={transacao.id} className="hover:bg-muted/50">
                        <TableCell>{format(transacao.data, "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={transacao.tipo === "entrada" ? "outline" : "destructive"}>
                            {transacao.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={cn(
                            "font-medium",
                            transacao.tipo === "entrada"
                              ? "text-green-500 dark:text-green-400"
                              : "text-red-500 dark:text-red-400",
                          )}
                        >
                          {formatCurrency(transacao.valor)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{transacao.descricao}</TableCell>
                        <TableCell className="hidden md:table-cell">{transacao.categoria}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graficos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle>Entradas e Saídas por Mês</CardTitle>
                <CardDescription>Comparativo mensal de valores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosGraficoBarras}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mes" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-background to-muted/50 border-primary/10 shadow-sm">
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
                <CardDescription>Valores por categoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGraficoPizza}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {dadosGraficoPizza.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

