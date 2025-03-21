"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, DownloadIcon, FileTextIcon, UsersIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Transacao {
  id: number
  data: Date
  tipo: string
  valor: number
  descricao: string
  categoria: string
  metodo: string
  responsavel: string
}

interface ExportarRelatorioProps {
  transacoesFiltradas: Transacao[]
  todasTransacoes: Transacao[]
}

export function ExportarRelatorio({ transacoesFiltradas, todasTransacoes }: ExportarRelatorioProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportType, setExportType] = useState<"detalhado" | "simplificado">("detalhado")
  const [exportPeriod, setExportPeriod] = useState<"tudo" | "filtrado" | "personalizado">("filtrado")
  const [exportStartDate, setExportStartDate] = useState<Date | undefined>(undefined)
  const [exportEndDate, setExportEndDate] = useState<Date | undefined>(undefined)

  // Função para exportar relatório
  const exportarRelatorio = () => {
    // Determinar quais transações exportar com base no período selecionado
    let transacoesParaExportar = transacoesFiltradas

    if (exportPeriod === "tudo") {
      transacoesParaExportar = todasTransacoes
    } else if (exportPeriod === "personalizado" && exportStartDate && exportEndDate) {
      transacoesParaExportar = todasTransacoes.filter((t) => t.data >= exportStartDate && t.data <= exportEndDate)
    }

    // Formatar os dados com base no tipo de relatório
    let csvContent = ""

    if (exportType === "detalhado") {
      // Cabeçalho para relatório detalhado
      csvContent = "Data,Tipo,Valor,Descrição,Categoria,Método,Responsável\n"

      // Dados para relatório detalhado
      transacoesParaExportar.forEach((t) => {
        csvContent += `${format(t.data, "dd/MM/yyyy")},${t.tipo},${t.valor.toFixed(2)},"${t.descricao}",${t.categoria},${t.metodo},"${t.responsavel}"\n`
      })
    } else {
      // Cabeçalho para relatório simplificado
      csvContent = "Data,Tipo,Valor,Descrição\n"

      // Dados para relatório simplificado
      transacoesParaExportar.forEach((t) => {
        csvContent += `${format(t.data, "dd/MM/yyyy")},${t.tipo},${t.valor.toFixed(2)},"${t.descricao}"\n`
      })
    }

    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `relatorio_${exportType}_${format(new Date(), "dd-MM-yyyy")}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Fechar o diálogo e mostrar notificação
    setExportDialogOpen(false)
    toast({
      title: "Relatório exportado com sucesso",
      description: `O relatório ${exportType} foi baixado para o seu computador.`,
      duration: 3000,
    })
  }

  return (
    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <DownloadIcon className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
          <DialogDescription>Configure as opções de exportação do relatório</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-type">Tipo de Relatório</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={exportType === "detalhado" ? "default" : "outline"}
                onClick={() => setExportType("detalhado")}
                className="justify-start gap-2"
              >
                <FileTextIcon className="h-4 w-4" />
                Detalhado
                <Badge variant="secondary" className="ml-auto">
                  Administração
                </Badge>
              </Button>
              <Button
                variant={exportType === "simplificado" ? "default" : "outline"}
                onClick={() => setExportType("simplificado")}
                className="justify-start gap-2"
              >
                <UsersIcon className="h-4 w-4" />
                Simplificado
                <Badge variant="secondary" className="ml-auto">
                  Membros
                </Badge>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {exportType === "detalhado"
                ? "Inclui todas as informações detalhadas para a administração."
                : "Versão simplificada com informações básicas para os membros."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-period">Período</Label>
            <Select value={exportPeriod} onValueChange={(value) => setExportPeriod(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filtrado">Usar filtros atuais</SelectItem>
                <SelectItem value="tudo">Todos os dados</SelectItem>
                <SelectItem value="personalizado">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {exportPeriod === "personalizado" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportStartDate ? format(exportStartDate, "dd/MM/yyyy") : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportStartDate}
                      onSelect={setExportStartDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {exportEndDate ? format(exportEndDate, "dd/MM/yyyy") : <span>Selecione</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={exportEndDate}
                      onSelect={setExportEndDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={exportarRelatorio}>Exportar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

