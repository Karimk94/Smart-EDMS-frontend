import React from 'react';
import { DocumentItem } from './DocumentItem';
import { DocumentItemSkeleton } from './DocumentItemSkeleton';
import { useDocumentTagsBatch } from '../../hooks/useDocumentTagsBatch';

import { DocumentListProps } from '../../interfaces/PropsInterfaces';

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDocumentClick,
  apiURL,
  onTagSelect,
  isLoading,
  processingDocs,

  lang,
  t
}) => {
  const docIds = documents.map((doc) => doc.doc_id);
  const { data: tagsMap = {}, isLoading: isTagsBatchLoading } = useDocumentTagsBatch({
    docIds,
    lang,
    enabled: !isLoading,
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
      {isLoading
        ? Array.from({ length: 10 }).map((_, index) => <DocumentItemSkeleton key={index} />)
        : documents.map(doc => (
          <DocumentItem
            key={doc.doc_id}
            doc={doc}
            onDocumentClick={onDocumentClick}
            apiURL={apiURL}
            onTagSelect={onTagSelect}
            isProcessing={processingDocs.includes(doc.doc_id)}
            itemTags={tagsMap[String(doc.doc_id)] || []}
            isTagsLoading={isTagsBatchLoading}
            lang={lang}
            t={t}
          />
        ))}
    </div>
  );
};
