import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Camera, 
  X, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Import Tesseract.js for OCR
import { createWorker } from 'tesseract.js';

const UploadOCR = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [ocrResults, setOcrResults] = useState<string[]>([]);
  const [processedImages, setProcessedImages] = useState<boolean[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'upload' | 'ocr' | 'edit' | 'confirm'>('upload');
  const [editedText, setEditedText] = useState('');
  const [platform, setPlatform] = useState('');
  const [blurFaces, setBlurFaces] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      toast({
        title: "Formato inválido",
        description: "Por favor, envie apenas imagens (PNG, JPG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    setFiles(imageFiles);
    
    // Create preview URLs
    const urls = imageFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setOcrResults(new Array(imageFiles.length).fill(''));
    setProcessedImages(new Array(imageFiles.length).fill(false));
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processOCR = async () => {
    setLoading(true);
    setStep('ocr');

    try {
      const worker = await createWorker('por', 1, {
        logger: m => console.log(m)
      });

      const results: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Process OCR
        const { data: { text } } = await worker.recognize(file);
        results.push(text);
        
        // Update progress
        setOcrResults([...results, ...new Array(files.length - results.length).fill('')]);
        setProcessedImages(prev => {
          const newProcessed = [...prev];
          newProcessed[i] = true;
          return newProcessed;
        });
      }

      await worker.terminate();
      
      // Combine all OCR results
      const combinedText = results.filter(text => text.trim()).join('\n\n');
      setEditedText(combinedText);
      setStep('edit');

      toast({
        title: "OCR concluído!",
        description: `Texto extraído de ${files.length} imagem(ns). Revise o resultado.`,
      });

    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "Erro no OCR",
        description: "Não foi possível extrair o texto. Tente novamente.",
        variant: "destructive",
      });
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const parseConversation = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const messages: any[] = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed) {
        // Simple pattern matching for common dating app formats
        // This would be enhanced with more sophisticated parsing
        const isUserMessage = /^(Você|Eu):/i.test(trimmed) || 
                            /^\d{2}:\d{2}/.test(trimmed) ||
                            trimmed.length < 100; // Assume shorter messages are from user
        
        messages.push({
          role: isUserMessage ? 'user' : 'match',
          content: trimmed.replace(/^(Você|Eu):\s*/i, ''),
          timestamp: new Date()
        });
      }
    });

    return messages;
  };

  const calculateSpeakerConfidence = (messages: any[]) => {
    // Simple confidence calculation based on message patterns
    const totalMessages = messages.length;
    if (totalMessages === 0) return 0;

    const recognizedPatterns = messages.filter(msg => 
      msg.content.length > 3 && msg.content.length < 200
    ).length;

    return Math.min(recognizedPatterns / totalMessages, 1);
  };

  const saveConversation = async () => {
    if (!user || !editedText.trim() || !platform) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const parsedMessages = parseConversation(editedText);
      const speakerConfidence = calculateSpeakerConfidence(parsedMessages);
      
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `Conversa no ${platform}`,
          platform: platform.toLowerCase(),
          ocr_text: editedText,
          parsed_messages: parsedMessages,
          speaker_confidence: speakerConfidence,
          needs_confirmation: speakerConfidence < 0.8,
          metadata: {
            images_count: files.length,
            processing_method: 'tesseract_ocr'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Conversa salva!",
        description: "Agora você pode gerar sugestões para esta conversa.",
      });

      navigate(`/app/suggestions/${conversation.id}`);

    } catch (error) {
      console.error('Error saving conversation:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conversa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    URL.revokeObjectURL(previewUrls[index]);
    
    setFiles(newFiles);
    setPreviewUrls(newUrls);
    setOcrResults(new Array(newFiles.length).fill(''));
    setProcessedImages(new Array(newFiles.length).fill(false));
  };

  if (step === 'upload') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg to-surface">
        <header className="border-b border-surface bg-bg/80 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold text-text">Upload de Conversa</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border-0 bg-surface/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Envie screenshots da conversa
                </CardTitle>
                <p className="text-muted">
                  Faça upload de imagens da conversa para extrair o texto automaticamente
                </p>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 text-muted mx-auto mb-4" />
                    {isDragActive ? (
                      <p className="text-text">Solte as imagens aqui...</p>
                    ) : (
                      <>
                        <p className="text-text mb-2">
                          Arraste imagens aqui ou clique para selecionar
                        </p>
                        <p className="text-sm text-muted">
                          PNG, JPG ou WEBP até 10MB cada (máx. 5 imagens)
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg">
                      {blurFaces ? <EyeOff className="h-4 w-4 text-warning" /> : <Eye className="h-4 w-4 text-warning" />}
                      <span className="text-sm text-warning">
                        Rostos serão automaticamente borrados para proteger a privacidade
                      </span>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFiles([]);
                          setPreviewUrls([]);
                        }}
                      >
                        Limpar
                      </Button>
                      <Button
                        onClick={processOCR}
                        className="flex-1 bg-primary hover:bg-primary-hover"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Extrair texto
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'ocr') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg to-surface flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 bg-surface/80">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">
              Processando imagens...
            </h3>
            <p className="text-muted mb-6">
              Extraindo texto das imagens usando OCR local
            </p>
            
            <div className="space-y-2">
              {files.map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  {processedImages[index] ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                  <span className="text-sm text-muted">
                    Imagem {index + 1} {processedImages[index] ? '✓' : '...'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'edit') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bg to-surface">
        <header className="border-b border-surface bg-bg/80 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-text">Revisar texto</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="border-0 bg-surface/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  Revise o texto extraído
                </CardTitle>
                <p className="text-muted">
                  O OCR pode ter alguns erros. Corrija o texto antes de continuar.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tinder">Tinder</SelectItem>
                      <SelectItem value="bumble">Bumble</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="text">Texto da conversa</Label>
                  <Textarea
                    id="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Cole ou edite o texto da conversa aqui..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setStep('upload')}
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={saveConversation}
                    disabled={loading || !editedText.trim() || !platform}
                    className="flex-1 bg-primary hover:bg-primary-hover"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar conversa'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default UploadOCR;