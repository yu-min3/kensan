import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FieldSchema } from '@/types'

interface MetadataFormProps {
  schema: FieldSchema[]
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
}

export function MetadataForm({ schema, values, onChange }: MetadataFormProps) {
  if (schema.length === 0) return null

  const handleFieldChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value })
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">タイプ固有情報</h4>
      {schema.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label>
            {field.label}
            {field.required && ' *'}
          </Label>
          {renderField(field, values[field.key] ?? '', (v) => handleFieldChange(field.key, v))}
        </div>
      ))}
    </div>
  )
}

function renderField(
  field: FieldSchema,
  value: string,
  onChange: (value: string) => void
) {
  switch (field.type) {
    case 'string':
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
        />
      )

    case 'integer':
    case 'float': {
      const min = field.constraints?.min as number | undefined
      const max = field.constraints?.max as number | undefined
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          step={field.type === 'float' ? '0.1' : '1'}
          placeholder={field.label}
        />
      )
    }

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
          />
          <span className="text-sm">{field.label}</span>
        </div>
      )

    case 'enum': {
      const enumValues = (field.constraints?.values as string[]) ?? []
      return (
        <Select value={value || '_none'} onValueChange={(v) => onChange(v === '_none' ? '' : v)}>
          <SelectTrigger>
            <SelectValue placeholder={`${field.label}を選択`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">未選択</SelectItem>
            {enumValues.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'url':
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )

    default:
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
        />
      )
  }
}
