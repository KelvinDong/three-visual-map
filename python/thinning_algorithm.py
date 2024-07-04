# -*- coding: utf-8 -*-
import json
import os
from math import sqrt, pow


def point2LineDistance(point_a, point_b, point_c):
    """  计算点a到点b c所在直线的距离  :param point_a:  :param point_b:  :param point_c:  :return:  """
    # 首先计算b c 所在直线的斜率和截距
    if point_b[0] == point_c[0]:
        return 9999999
    slope = (point_b[1] - point_c[1]) / (point_b[0] - point_c[0])
    intercept = point_b[1] - slope * point_b[0]

    # 计算点a到b c所在直线的距离
    distance = abs(slope * point_a[0] - point_a[1] + intercept) / sqrt(1 + pow(slope, 2))
    return distance


class DouglasPeuker(object):

    def __init__(self, threshold=0.001):
        self.threshold = threshold
        self.qualify_list = list()
        self.disqualify_list = list()

    def diluting(self, point_list):
        """    抽稀    :param point_list:二维点列表    :return:    """
        if len(point_list) < 3:  # TODO :考虑小一点就直接删除了
            self.qualify_list.extend(point_list[::-1])
        else:
            # 找到与收尾两点连线距离最大的点
            max_distance_index, max_distance = 0, 0
            for index, point in enumerate(point_list):
                if index in [0, len(point_list) - 1]:
                    continue
                distance = point2LineDistance(point, point_list[0], point_list[-1])
                if distance > max_distance:
                    max_distance_index = index
                    max_distance = distance

            # 若最大距离小于阈值，则去掉所有中间点。 反之，则将曲线按最大距离点分割
            if max_distance < self.threshold:
                self.qualify_list.append(point_list[-1])
                self.qualify_list.append(point_list[0])
            else:
                # 将曲线按最大距离的点分割成两段
                sequence_a = point_list[:max_distance_index]
                sequence_b = point_list[max_distance_index:]

                for sequence in [sequence_a, sequence_b]:
                    if len(sequence) < 3 and sequence == sequence_b:
                        self.qualify_list.extend(sequence[::-1])
                    else:
                        self.disqualify_list.append(sequence)


    def line(self, point_list):
        self.qualify_list = list()
        self.disqualify_list = list()

        self.diluting(point_list)
        while len(self.disqualify_list) > 0:
            self.diluting(self.disqualify_list.pop())
        # print(str(len(self.qualify_list)) + ":"+ str(self.qualify_list) )
        print(str(len(self.qualify_list)))
        # return self.qualify_list

    def multi_polygon(self,polygons):
        
        # 经度
        min0 = 180
        max0 = -180
        # 纬度
        min1 = 90
        max1 = -90

        # 先计算最大经纬度差值
        for polygon in polygons:
            for ring in polygon:
                for point in ring:
                    if point[0] < min0:
                        min0 = point[0]
                    if point[0] > max0:
                        max0 = point[0]
                    if point[1] < min1:
                        min1 = point[1]
                    if point[1] > max1:
                        max1 = point[1]
        difference0 = max(max0 - min0, max1 - min1)
        self.threshold = difference0/617
        print("阈值：%s,%s,%s,%s => %s" % (min0,max0,min1,max1, self.threshold))
        
        
        out_multi_polygon = list()
        for polygon in polygons:
            out_polygon = list()
            for ring in polygon:
                self.line(ring)
                if len(self.qualify_list)> 4 :
                    out_polygon.append(self.qualify_list)
            out_multi_polygon.append(out_polygon)
        return out_multi_polygon


if __name__ == '__main__':

    # THRESHOLD_DICT = {"country": 0.003,
    #                   "province": 0.0006,
    #                   "city": 0.00012,
    #                   "district": 0.000024,
    #                   "street": 0
    #                   }

    d = DouglasPeuker()

    # multi_polygon = \
    #     [ # multi_polygon
    #         [ # polygon
    #             [ #ring
    #                 [] #点
    #             ]
    #         ]
    #     ]
    file_ext = 'json'

    current_path = os.path.dirname(os.path.realpath(__file__))
    input_path = os.path.join(current_path, 'china_data')
    for item in os.listdir(input_path):
        if item.endswith(file_ext) :# and item.startswith('1000'):
            input_file_path = os.path.join(input_path, item)
            with open(input_file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            district_feature = json.loads(content)

            out_sub_districts = list()
            for sub_feature in district_feature["properties"]["districts"]:
                sub_feature["geometry"]["coordinates"] = d.multi_polygon(sub_feature["geometry"]["coordinates"])
                out_sub_districts.append(sub_feature)
            district_feature["properties"]["districts"] = out_sub_districts

            district_feature["geometry"]["coordinates"] = d.multi_polygon(district_feature["geometry"]["coordinates"])

            output_file_path = os.path.join(input_path, "output", item)
            with open(output_file_path, "w", encoding='utf-8') as f:
                f.write(json.dumps(district_feature, ensure_ascii=False))
