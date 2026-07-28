export class KnowledgeContextBuilder {
  build({ selectedDocuments, currentContext }) {
    const contextLines = [
      `Department: ${currentContext.department}`,
      `Language: ${currentContext.language}`,
      `Company: ${currentContext.companyName}`,
      `Company Address: ${currentContext.companyAddress}`,
      `Primary Contact: ${currentContext.contactName}`,
    ];

    const documentBlocks = selectedDocuments.map((document, index) => {
      return [
        `Document ${index + 1}: ${document.title}`,
        `Category: ${document.category}`,
        `Description: ${document.description}`,
        `Tags: ${document.tags.join(', ')}`,
        `Author: ${document.author}`,
        `Status: ${document.status}`,
      ].join('\n');
    });

    return [
      'Current Context:',
      ...contextLines,
      '',
      'Selected Knowledge Documents:',
      ...(documentBlocks.length > 0 ? documentBlocks : ['No knowledge documents selected.']),
    ].join('\n');
  }
}
