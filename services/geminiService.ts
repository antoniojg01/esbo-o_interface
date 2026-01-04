
import { GoogleGenAI, Type } from "@google/genai";
import { GraphData } from "../types";

export const analyzeImageToGraph = async (base64Image: string): Promise<GraphData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        parts: [
          {
            text: `Translate this architectural diagram or flowchart into a 3D Orbital Topology using EON syntax.

            Rules for EON Orbital Syntax:
            1. CENTRAL AXIS: Major categories/folders MUST end in ".CORE" (e.g. "DATA_CENTER.CORE").
               Format: node "NAME.CORE" { pos: [0, Y_COORD, 0]; size: float; desc: "string"; }
            2. ORBITS: Sub-elements rotate around a .CORE parent.
               Format: orbit "ID" { parent: "PARENT_CORE_ID"; radius: float; rot: [X, Y, Z]; nodes: ["Sub1", "Sub2"]; }
            
            Return a JSON object:
            {
              "title": "Short Project Title",
              "analysis": "Brief technical breakdown",
              "eonCode": "THE FULL GENERATED CODE BLOCK",
              "centralNodes": [],
              "orbits": []
            }
            
            Ensure the eonCode follows the exact bracket-based syntax of EON Topology V2.`
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          analysis: { type: Type.STRING },
          eonCode: { type: Type.STRING },
          centralNodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                label: { type: Type.STRING },
                description: { type: Type.STRING },
                position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                size: { type: Type.NUMBER }
              }
            }
          },
          orbits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                radius: { type: Type.NUMBER },
                rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                parentIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                nodes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      label: { type: Type.STRING },
                      description: { type: Type.STRING },
                      position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                      size: { type: Type.NUMBER }
                    }
                  }
                }
              }
            }
          }
        },
        required: ["title", "analysis", "eonCode", "centralNodes", "orbits"]
      }
    }
  });

  return JSON.parse(response.text);
};
