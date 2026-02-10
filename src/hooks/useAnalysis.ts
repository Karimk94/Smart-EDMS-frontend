
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface AnalyzeImageParams {
    imageFile: File;
    docId: number;
}

interface AddFaceParams {
    name: string;
    location: any;
    original_image_b64: string;
}

interface AddPersonParams {
    name: string;
    lang: string;
}

interface UpdateAbstractParams {
    doc_id: number;
    names: string[];
}

export function useAnalysis() {
    const queryClient = useQueryClient();

    const analyzeImageMutation = useMutation({
        mutationFn: async ({ imageFile, docId }: AnalyzeImageParams) => {
            const formData = new FormData();
            formData.append('image_file', imageFile, `${docId}.jpg`);

            const response = await fetch(`/api/analyze_image`, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }
            return response.json();
        },
    });

    const addFaceMutation = useMutation({
        mutationFn: async (params: AddFaceParams) => {
            const response = await fetch(`/api/add_face`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add face');
            }
            return response.json();
        },
    });

    const addPersonMutation = useMutation({
        mutationFn: async (params: AddPersonParams) => {
            const response = await fetch(`/api/add_person`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add person');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['persons'] });
        },
    });

    const updateAbstractMutation = useMutation({
        mutationFn: async (params: UpdateAbstractParams) => {
            const response = await fetch(`/api/update_abstract`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update abstract');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
        }
    });

    return {
        analyzeImage: analyzeImageMutation.mutateAsync,
        isAnalyzing: analyzeImageMutation.isPending,
        addFace: addFaceMutation.mutateAsync,
        isAddingFace: addFaceMutation.isPending,
        addPerson: addPersonMutation.mutateAsync,
        isAddingPerson: addPersonMutation.isPending,
        updateAbstract: updateAbstractMutation.mutateAsync,
        isUpdatingAbstract: updateAbstractMutation.isPending
    };
}
