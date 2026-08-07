"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = useState<'uniforms' | 'canteen' | 'assets'>('uniforms');

  const stockItems = [
    { id: "SKU-01", item: "Roseland Crested School Shirt (Sizes 26–34)", category: "Uniform", inStock: 48, minRequired: 20, unitPrice: "GH₵ 85", status: "In Stock" },
    { id: "SKU-02", item: "Roseland Tartan Pinafore / Skirt", category: "Uniform", inStock: 12, minRequired: 25, unitPrice: "GH₵ 110", status: "Low Stock" },
    { id: "SKU-03", item: "Friday African Print Attire (Batik)", category: "Uniform", inStock: 35, minRequired: 20, unitPrice: "GH₵ 95", status: "In Stock" },
    { id: "SKU-04", item: "Crested Exercise Books (Bundle of 10)", category: "Stationery", inStock: 120, minRequired: 50, unitPrice: "GH₵ 60", status: "In Stock" },
    { id: "SKU-05", item: "JHS Science Lab Coat (White)", category: "Lab Gear", inStock: 8, minRequired: 15, unitPrice: "GH₵ 75", status: "Low Stock" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Store & Inventory
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Canteen Rations, Uniforms & Assets
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Monitor uniform store stocks, daily nutrition headcounts, and school fixed asset depreciation.
          </p>
        </div>

        <button
          onClick={() => toast.success("Stock order voucher sent to school suppliers.")}
          className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5"
        >
          <i className="ph-bold ph-plus-circle"></i> Create Restock Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('uniforms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'uniforms' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Uniforms & Book Store Stock
        </button>
        <button
          onClick={() => setActiveTab('canteen')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'canteen' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Daily Canteen Headcount
        </button>
      </div>

      {/* 1. STOCK VIEW */}
      {activeTab === 'uniforms' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Item Code & Name</th>
                  <th className="py-4 px-4">Category</th>
                  <th className="py-4 px-4">Current Stock</th>
                  <th className="py-4 px-4">Unit Price</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <strong className="text-sm font-bold text-brand-textMain block">{item.item}</strong>
                      <span className="font-mono text-[10px] text-gray-400">{item.id}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-semibold text-brand-violet bg-brand-violetLight/60 px-2.5 py-1 rounded-lg">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-brand-textMain block">{item.inStock} units</strong>
                      <span className="text-[10px] text-gray-400">Min threshold: {item.minRequired}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-gray-800">{item.unitPrice}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => toast.success(`Issued restock request for ${item.item}`)}
                        className="px-3 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white rounded-lg font-bold text-brand-textMain transition-all text-xs"
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CANTEEN VIEW */}
      {activeTab === 'canteen' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-brand-textMain">Today's Nutrition Headcount: 412 Meals</h3>
              <p className="text-xs text-brand-textMuted">Menu: Jollof Rice with Grilled Chicken & Fresh Fruit Salad</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-800 font-bold text-xs rounded-full">
              Kitchen Preparation Complete
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-brand-bg rounded-2xl">
              <span className="text-xs text-gray-400 block font-bold">Early Years</span>
              <strong className="text-xl font-bold text-brand-textMain">84 Meals</strong>
            </div>
            <div className="p-4 bg-brand-bg rounded-2xl">
              <span className="text-xs text-gray-400 block font-bold">Lower Primary</span>
              <strong className="text-xl font-bold text-brand-textMain">138 Meals</strong>
            </div>
            <div className="p-4 bg-brand-bg rounded-2xl">
              <span className="text-xs text-gray-400 block font-bold">Upper Primary</span>
              <strong className="text-xl font-bold text-brand-textMain">110 Meals</strong>
            </div>
            <div className="p-4 bg-brand-bg rounded-2xl">
              <span className="text-xs text-gray-400 block font-bold">Junior High</span>
              <strong className="text-xl font-bold text-brand-textMain">80 Meals</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
